"""Iteration 2 backend tests: Period Comparison, Anomaly Detection, Bank Reconciliation, AI explains."""
import io
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
METRICS = ["revenue", "cogs", "gross_profit", "operating_expense", "net_profit", "net_margin"]


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
def client(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"login failed {r.status_code}: {r.text[:300]}")
    body = r.json()
    token = body.get("token")
    assert token and isinstance(token, str)
    assert body.get("email") == creds["email"]
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def _assert_delta(d):
    assert set(["value", "diff", "pct", "direction"]).issubset(d.keys())
    assert isinstance(d["value"], (int, float))
    assert d["direction"] in ("up", "down", "flat")


# ---------------- Period Comparison ----------------
class TestPeriodCompare:
    def test_fy(self, client):
        r = client.get(f"{API}/financial/pnl-compare?period=FY", timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["period"] == "FY"
        assert d["prev_key"] is None
        assert d["previous"] is None
        assert d["yoy"] is not None
        assert len(d["comparison"]) == 6
        assert [c["key"] for c in d["comparison"]] == METRICS
        for c in d["comparison"]:
            assert c["prev_period"] is None
            _assert_delta(c["yoy"])
        assert abs(d["current"]["revenue"] - 181230000) < 1

    def test_q2(self, client):
        r = client.get(f"{API}/financial/pnl-compare?period=Q2", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["prev_key"] == "Q1"
        assert d["previous"] is not None
        assert d["yoy"] is not None
        for c in d["comparison"]:
            _assert_delta(c["prev_period"])
            _assert_delta(c["yoy"])
        # prev_period value must equal Q1 current
        q1 = client.get(f"{API}/financial/pnl-compare?period=Q1", timeout=60).json()
        rev_cmp = next(c for c in d["comparison"] if c["key"] == "revenue")
        assert abs(rev_cmp["prev_period"]["value"] - q1["current"]["revenue"]) < 1
        assert abs(rev_cmp["prev_period"]["diff"] - (d["current"]["revenue"] - q1["current"]["revenue"])) < 1

    def test_q1_no_prev(self, client):
        d = client.get(f"{API}/financial/pnl-compare?period=Q1", timeout=60).json()
        assert d["prev_key"] is None and d["previous"] is None
        assert d["yoy"] is not None

    def test_m1_no_prev_m2_has_prev(self, client):
        d1 = client.get(f"{API}/financial/pnl-compare?period=M1", timeout=60).json()
        assert d1["prev_key"] is None and d1["previous"] is None
        assert all(c["prev_period"] is None for c in d1["comparison"])
        d2 = client.get(f"{API}/financial/pnl-compare?period=M2", timeout=60).json()
        assert d2["prev_key"] == "M1"
        assert abs(next(c for c in d2["comparison"] if c["key"] == "revenue")["prev_period"]["value"]
                   - d1["current"]["revenue"]) < 1

    def test_quarters_sum_to_fy(self, client):
        fy = client.get(f"{API}/financial/pnl-compare?period=FY", timeout=60).json()["current"]["revenue"]
        tot = 0
        for q in ("Q1", "Q2", "Q3", "Q4"):
            tot += client.get(f"{API}/financial/pnl-compare?period={q}", timeout=60).json()["current"]["revenue"]
        assert abs(tot - fy) < 1

    def test_invalid_period_falls_back_to_fy(self, client):
        d = client.get(f"{API}/financial/pnl-compare?period=BOGUS", timeout=60).json()
        assert d["period"] == "FY"

    def test_requires_auth(self):
        r = requests.get(f"{API}/financial/pnl-compare?period=Q2", timeout=30)
        assert r.status_code in (401, 403)


# ---------------- Anomaly detection ----------------
class TestAnomalies:
    def test_detect(self, client):
        r = client.get(f"{API}/anomalies", timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["summary"]["total"] > 0
        assert d["summary"]["total"] == len(d["anomalies"])
        assert d["summary"]["red"] + d["summary"]["yellow"] == d["summary"]["total"]
        types = set()
        for a in d["anomalies"]:
            assert {"id", "type", "severity", "title", "description", "evidence"} <= set(a.keys())
            assert a["severity"] in ("red", "yellow")
            assert isinstance(a["evidence"], dict) and a["evidence"]
            assert any(isinstance(v, (int, float)) for v in a["evidence"].values())
            types.add(a["type"])
        assert types <= {"expense_spike", "revenue_drop", "low_margin_job"}
        assert sum(d["summary"]["by_type"].values()) == d["summary"]["total"]
        # ids unique
        ids = [a["id"] for a in d["anomalies"]]
        assert len(ids) == len(set(ids))

    def test_requires_auth(self):
        assert requests.get(f"{API}/anomalies", timeout=30).status_code in (401, 403)


class TestAIAnomalyInsights:
    def test_insights(self, client):
        r = client.get(f"{API}/ai/anomaly-insights", timeout=AI_TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        assert "detection" in d and "ai" in d
        ai = d["ai"]
        for k in ("summary", "findings", "risks", "recommendations", "confidence", "sources"):
            assert k in ai, f"missing {k}"
        assert isinstance(ai["findings"], list)
        assert len(ai["summary"]) > 20, f"empty AI summary: {ai}"
        assert len(ai["findings"]) > 0, f"no findings: {ai}"
        assert ai["confidence"] in ("high", "medium", "low")
        # grounding: at least one detected anomaly keyword appears in AI text
        blob = (ai["summary"] + " ".join(ai["findings"]) + " ".join(ai["recommendations"])).lower()
        keys = []
        for a in d["detection"]["anomalies"][:8]:
            ev = a["evidence"]
            if "job_number" in ev:
                keys.append(str(ev["job_number"]).lower())
            if "account" in ev:
                keys.append(str(ev["account"]).lower())
        assert any(k in blob for k in keys), f"AI text not grounded in anomalies. blob={blob[:400]}"


# ---------------- Bank reconciliation ----------------
class TestReconciliation:
    def test_demo(self, client):
        r = client.get(f"{API}/reconciliation/demo?month=6", timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["month"] == 6
        res = d["result"]
        assert isinstance(d["statement"], list) and len(d["statement"]) > 0
        assert res["difference"] != 0
        assert res["reconciled"] is False
        assert res["matched_count"] > 0
        assert len(res["unmatched_book"]) >= 1
        descs = [s["description"] for s in res["unmatched_statement"]]
        assert "Biaya Administrasi Bank" in descs
        assert "Bunga Jasa Giro" in descs
        adm = next(s for s in res["unmatched_statement"] if s["description"] == "Biaya Administrasi Bank")
        bng = next(s for s in res["unmatched_statement"] if s["description"] == "Bunga Jasa Giro")
        assert adm["amount"] == -150000
        assert bng["amount"] == 25000
        # arithmetic consistency
        assert abs(res["difference"] - (res["statement_balance"] - res["book_balance"])) < 0.01
        assert abs(res["statement_balance"] - sum(s["amount"] for s in d["statement"])) < 0.01

    def test_demo_other_month(self, client):
        r = client.get(f"{API}/reconciliation/demo?month=3", timeout=60)
        assert r.status_code == 200
        assert r.json()["month"] == 3

    def test_upload_csv(self, client):
        # build a statement CSV from the demo book movements so most rows match
        demo = client.get(f"{API}/reconciliation/demo?month=6", timeout=60).json()
        rows = demo["statement"][:6]
        csv = "Tanggal,Keterangan,Nominal\n" + "\n".join(
            f"{x['date']},{x['description'].replace(',', ' ')},{int(x['amount'])}" for x in rows)
        files = {"file": ("TEST_statement.csv", io.BytesIO(csv.encode()), "text/csv")}
        r = client.post(f"{API}/reconciliation/upload", files=files, timeout=90)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert len(d["statement"]) == len(rows)
        res = d["result"]
        assert res["statement_count"] == len(rows)
        assert res["matched_count"] >= 1
        assert abs(res["difference"] - (res["statement_balance"] - res["book_balance"])) < 0.01

    def test_upload_bad_columns(self, client):
        csv = "Foo,Bar\n1,2\n"
        files = {"file": ("TEST_bad.csv", io.BytesIO(csv.encode()), "text/csv")}
        r = client.post(f"{API}/reconciliation/upload", files=files, timeout=60)
        assert r.status_code == 400, r.text[:200]

    def test_upload_unsupported_format(self, client):
        files = {"file": ("TEST_x.txt", io.BytesIO(b"hello"), "text/plain")}
        r = client.post(f"{API}/reconciliation/upload", files=files, timeout=60)
        assert r.status_code == 400

    def test_requires_auth(self):
        assert requests.get(f"{API}/reconciliation/demo?month=6", timeout=30).status_code in (401, 403)


class TestAIReconExplain:
    def test_explain(self, client):
        res = client.get(f"{API}/reconciliation/demo?month=6", timeout=60).json()["result"]
        r = client.post(f"{API}/ai/reconciliation-explain", json={"result": res}, timeout=AI_TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        ai = r.json()
        for k in ("summary", "findings", "risks", "recommendations", "confidence", "sources"):
            assert k in ai, f"missing {k}"
        assert len(ai["summary"]) > 20, ai
        assert len(ai["findings"]) > 0, ai
        blob = (ai["summary"] + " ".join(ai["findings"])).lower()
        assert "administrasi" in blob or "150" in blob, f"AI did not cite evidence: {blob[:400]}"
        # guardrail: must not accuse fraud
        assert not any(w in blob for w in ("fraud", "penggelapan", "korupsi", "dicuri", "pencurian")), blob[:400]

    def test_empty_body(self, client):
        r = client.post(f"{API}/ai/reconciliation-explain", json={}, timeout=AI_TIMEOUT)
        assert r.status_code in (200, 400, 422), r.text[:300]


# ---------------- light regression ----------------
class TestRegression:
    def test_dashboard(self, client):
        r = client.get(f"{API}/dashboard", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert len(d["kpi_cards"]) == 8
        assert abs(next(c for c in d["kpi_cards"] if c["key"] == "revenue")["value"] - 181230000) < 1

    def test_pnl(self, client):
        r = client.get(f"{API}/financial/pnl", timeout=60)
        assert r.status_code == 200
        cur = r.json()["current"]
        assert abs(cur["revenue"] - 181230000) < 1
        assert abs(cur["net_profit"] - 49169996) < 1

    def test_balance_sheet(self, client):
        r = client.get(f"{API}/financial/balance-sheet", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["balanced"] is True
        assert abs(d["total_assets"] - (d["total_liabilities"] + d["total_equity"])) < 1
