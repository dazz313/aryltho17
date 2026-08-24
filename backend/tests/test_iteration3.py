"""Iteration 3 backend tests: Tax Center, AI Tax Advice, Complete Statements (SAK EMKM), light regression."""
import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"
AI_TIMEOUT = 240


@pytest.fixture(scope="session")
def creds():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("missing test_credentials.md")
    c = p.read_text(encoding="utf-8")
    e = re.search(r'(?im)^\s*(?:[-*]\s*)?(?:\*\*)?email(?:\*\*)?\s*:\s*`?([^`\s]+)', c)
    pw = re.search(r'(?im)^\s*(?:[-*]\s*)?(?:\*\*)?password(?:\*\*)?\s*:\s*`?([^`\s]+)', c)
    if not e or not pw:
        pytest.skip("no creds parsed")
    return {"email": e.group(1), "password": pw.group(1)}


@pytest.fixture(scope="session")
def token(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"login failed {r.status_code}: {r.text[:300]}")
    t = r.json().get("token")
    if not t:
        pytest.fail("no token in login response")
    return t


@pytest.fixture(scope="session")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="session")
def tax_nonpkp(client):
    r = client.get(f"{API}/tax/summary", params={"pkp": "false"}, timeout=60)
    assert r.status_code == 200, r.text[:300]
    return r.json()


@pytest.fixture(scope="session")
def tax_pkp(client):
    r = client.get(f"{API}/tax/summary", params={"pkp": "true"}, timeout=60)
    assert r.status_code == 200, r.text[:300]
    return r.json()


@pytest.fixture(scope="session")
def complete(client):
    r = client.get(f"{API}/statements/complete", timeout=60)
    assert r.status_code == 200, r.text[:300]
    return r.json()


# ---------------- module: tax_center (non-PKP) ----------------
class TestTaxSummaryNonPKP:
    def test_auth_required(self):
        r = requests.get(f"{API}/tax/summary", timeout=30)
        assert r.status_code in (401, 403), r.status_code

    def test_no_mongo_id(self, tax_nonpkp):
        assert "_id" not in str(tax_nonpkp)

    def test_revenue_and_pretax_profit(self, tax_nonpkp):
        assert tax_nonpkp["revenue"] == 181_230_000
        assert tax_nonpkp["net_profit_before_tax"] == 49_169_996

    def test_pph_final(self, tax_nonpkp):
        f = tax_nonpkp["pph_final"]
        assert f["rate_pct"] == 0.5
        assert f["base"] == 181_230_000
        assert f["annual"] == 906_150
        assert f["monthly_avg"] == pytest.approx(906_150 / 12, abs=0.01)
        assert len(f["monthly"]) == 12
        assert sum(m["amount"] for m in f["monthly"]) == pytest.approx(906_150, abs=1)

    def test_pph_badan_31e(self, tax_nonpkp):
        b = tax_nonpkp["pph_badan"]
        assert b["facility_31e"] is True
        assert b["effective_rate_pct"] == 11
        assert b["rate_pct"] == 22
        assert b["taxable_income"] == 49_169_996
        assert b["tax"] == pytest.approx(5_408_699.56, abs=0.5)
        assert b["tax_without_facility"] == pytest.approx(10_817_399.12, abs=0.5)

    def test_comparison(self, tax_nonpkp):
        c = tax_nonpkp["comparison"]
        assert c["cheaper"] == "final"
        assert c["saving"] == pytest.approx(4_502_549.56, abs=1)
        assert c["final"] == 906_150

    def test_ppn_non_pkp_zero(self, tax_nonpkp):
        p = tax_nonpkp["ppn"]
        assert p["pkp"] is False
        assert p["output"] == 0 and p["input"] == 0 and p["payable"] == 0

    def test_pph21_below_ptkp(self, tax_nonpkp):
        p = tax_nonpkp["pph21"]
        assert p["ptkp"] == 54_000_000
        assert p["payroll_base"] == 30_000_000
        assert p["taxable"] == 0
        assert p["estimate"] == 0

    def test_pph23(self, tax_nonpkp):
        p = tax_nonpkp["pph23"]
        assert p["rate_pct"] == 2
        assert p["credit_from_customers"] == pytest.approx(3_624_600, abs=1)
        assert p["withhold_on_rent"] == pytest.approx(p["rent_base"] * 0.02, abs=1)

    def test_monthly_obligations(self, tax_nonpkp):
        obs = tax_nonpkp["monthly_obligations"]
        assert len(obs) >= 2
        types = [o["type"] for o in obs]
        assert "final" in types and "annual" in types
        assert "ppn" not in types  # non-PKP
        assert "pph21" not in types  # zero estimate
        for o in obs:
            assert o["tax"] and o["freq"] and o["due"]
        annual = next(o for o in obs if o["type"] == "annual")
        assert annual["amount"] == 906_150  # cheaper regime chosen

    def test_notes_present(self, tax_nonpkp):
        assert len(tax_nonpkp["notes"]) >= 4


# ---------------- module: tax_center (PKP) ----------------
class TestTaxSummaryPKP:
    def test_ppn_values(self, tax_pkp):
        p = tax_pkp["ppn"]
        assert p["pkp"] is True
        assert p["rate_pct"] == 12
        assert p["output"] == pytest.approx(21_747_600, abs=1)
        assert p["input_base"] == 45_000_000
        assert p["input"] == pytest.approx(5_400_000, abs=1)
        assert p["payable"] == pytest.approx(16_347_600, abs=1)

    def test_ppn_obligation_added(self, tax_pkp):
        types = [o["type"] for o in tax_pkp["monthly_obligations"]]
        assert "ppn" in types

    def test_pph_unchanged_by_pkp(self, tax_pkp, tax_nonpkp):
        assert tax_pkp["pph_final"]["annual"] == tax_nonpkp["pph_final"]["annual"]
        assert tax_pkp["pph_badan"]["tax"] == tax_nonpkp["pph_badan"]["tax"]


# ---------------- module: AI tax advice (Gemini) ----------------
class TestAITaxAdvice:
    def test_tax_advice(self, client):
        r = client.get(f"{API}/ai/tax-advice", params={"pkp": "false"}, timeout=AI_TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        assert "summary" in d and "ai" in d
        assert d["summary"]["comparison"]["cheaper"] == "final"
        ai = d["ai"]
        assert isinstance(ai, dict), type(ai)
        assert ai, "empty AI payload"
        blob = str(ai).lower()
        assert "error" not in blob or "final" in blob, f"AI error: {blob[:400]}"
        # AI must ground in real numbers / regime naming
        assert ("final" in blob or "umkm" in blob), blob[:300]
        assert ("906" in blob or "0,5" in blob or "0.5" in blob), blob[:400]


# ---------------- module: statements (SAK EMKM) ----------------
class TestCompleteStatements:
    def test_auth_required(self):
        r = requests.get(f"{API}/statements/complete", timeout=30)
        assert r.status_code in (401, 403)

    def test_income_statement(self, complete):
        i = complete["income_statement"]
        assert i["revenue"] == 181_230_000
        assert i["gross_profit"] == 111_230_000
        assert i["operating_profit"] == 49_169_996
        assert i["profit_before_tax"] == 49_169_996
        assert i["estimated_tax_final"] == 906_150
        assert i["profit_after_tax"] == 48_263_846
        # multi-step arithmetic ties
        assert i["revenue"] - i["cogs"] == pytest.approx(i["gross_profit"], abs=1)
        assert i["gross_profit"] - i["operating_expense"] == pytest.approx(i["operating_profit"], abs=1)
        assert i["revenue_rows"] and i["cogs_rows"] and i["opex_rows"]

    def test_balance_sheet_classified(self, complete):
        b = complete["balance_sheet"]
        assert b["current_assets_total"] == 170_370_000
        assert b["noncurrent_assets_total"] == 56_799_996
        assert b["total_assets"] == 227_169_996
        assert b["balanced"] is True
        assert b["total_liabilities_equity"] == pytest.approx(b["total_assets"], abs=1)
        assert b["current_assets"] and b["noncurrent_assets"]
        assert b["total_liabilities"] == pytest.approx(
            b["current_liabilities_total"] + b["noncurrent_liabilities_total"], abs=1)
        # no negative inventory (iteration-1 HIGH bug)
        inv = [a for a in b["current_assets"] if a["code"] == "1300"]
        for a in inv:
            assert a["amount"] >= 0, f"negative inventory {a}"

    def test_equity_includes_current_profit(self, complete):
        b = complete["balance_sheet"]
        codes = [e["code"] for e in b["equity"]]
        assert "3200" in codes
        assert b["total_equity"] == pytest.approx(sum(e["amount"] for e in b["equity"]), abs=1)

    def test_changes_in_equity(self, complete):
        e = complete["changes_in_equity"]
        assert e["beginning_equity"] == 130_000_000
        assert e["net_profit"] == 49_169_996
        assert e["ending_equity"] == 179_169_996
        assert e["beginning_equity"] + e["net_profit"] - e["prive"] == pytest.approx(e["ending_equity"], abs=1)

    def test_equity_ties_to_balance_sheet(self, complete):
        assert complete["changes_in_equity"]["ending_equity"] == pytest.approx(
            complete["balance_sheet"]["total_equity"], abs=1)

    def test_cash_flow_present(self, complete):
        cf = complete["cash_flow"]
        assert isinstance(cf, dict) and cf

    def test_notes_six(self, complete):
        n = complete["notes"]
        assert len(n) == 6
        for note in n:
            assert note["title"] and note["body"]
        assert "None" not in str(n), "unresolved None in notes body"

    def test_meta(self, complete):
        m = complete["meta"]
        assert m["standard"] == "SAK EMKM"
        assert m["currency"] == "IDR"
        assert m["name"]


def _flatten_numbers(obj):
    if isinstance(obj, dict):
        for v in obj.values():
            yield from _flatten_numbers(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _flatten_numbers(v)
    elif isinstance(obj, (int, float)):
        yield obj


# ---------------- regression ----------------
class TestRegression:
    def test_dashboard(self, client):
        r = client.get(f"{API}/dashboard", timeout=60)
        assert r.status_code == 200
        assert "181,230,000" in str(r.json()) or 181_230_000 in [
            v for v in _flatten_numbers(r.json())], list(r.json().keys())

    def test_balance_sheet(self, client):
        r = client.get(f"{API}/financial/balance-sheet", timeout=60)
        assert r.status_code == 200
        assert r.json()["balanced"] is True

    def test_anomalies(self, client):
        r = client.get(f"{API}/anomalies", timeout=60)
        assert r.status_code == 200
        assert isinstance(r.json().get("anomalies"), list)

    def test_reconciliation_demo(self, client):
        r = client.get(f"{API}/reconciliation/demo", timeout=60)
        assert r.status_code == 200

    def test_pnl_compare_q2(self, client):
        r = client.get(f"{API}/financial/pnl-compare", params={"period": "Q2"}, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["period"] == "Q2" and d["prev_key"] == "Q1"
        comps = d["comparison"] if "comparison" in d else d["metrics"]
        keys = {c["key"] for c in comps}
        assert {"revenue", "net_profit"} <= keys
        for c in comps:
            assert "prev_period" in c and "yoy" in c
            for blk in (c["prev_period"], c["yoy"]):
                assert {"value", "diff", "pct", "direction"} <= set(blk)

    def test_ratios_quick_le_current(self, client):
        r = client.get(f"{API}/financial/ratios", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["quick_ratio"] <= d["current_ratio"] + 0.001, d
