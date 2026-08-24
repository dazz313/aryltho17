"""Backend API tests for EraCool AI Financial Analyst."""
import io
import os
import re
import time
import uuid
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


# ---------------- fixtures ----------------
@pytest.fixture(scope="session")
def test_credentials():
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
def token(test_credentials):
    r = requests.post(f"{API}/auth/login", json=test_credentials, timeout=30)
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


# ---------------- health ----------------
def test_root():
    r = requests.get(f"{API}/", timeout=30)
    assert r.status_code == 200
    assert "message" in r.json()


# ---------------- auth module ----------------
class TestAuth:
    def test_login_success(self, test_credentials):
        r = requests.post(f"{API}/auth/login", json=test_credentials, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == test_credentials["email"]
        assert d["role"] == "owner"
        assert isinstance(d["token"], str) and len(d["token"]) > 20
        assert d.get("company_id")
        # httpOnly cookies set
        assert "access_token" in r.cookies
        assert "refresh_token" in r.cookies
        raw = r.headers.get("set-cookie", "")
        assert "HttpOnly" in raw

    def test_login_wrong_password(self, test_credentials):
        r = requests.post(f"{API}/auth/login",
                          json={"email": test_credentials["email"], "password": "wrong-pass-xyz"}, timeout=30)
        assert r.status_code == 401

    def test_login_unknown_email(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": "nobody-xyz@example.com", "password": "x"}, timeout=30)
        assert r.status_code == 401

    def test_me_with_bearer(self, client, test_credentials):
        r = client.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == test_credentials["email"]
        assert "password_hash" not in d
        assert "_id" not in d
        assert d.get("id")

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401

    def test_me_bad_token(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage.token.here"}, timeout=30)
        assert r.status_code == 401

    def test_register_new_user_and_login(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register",
                          json={"email": email, "password": "Passw0rd!23", "name": "TEST User", "role": "finance"},
                          timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["email"] == email
        assert d["role"] == "finance"
        assert d["company_id"] is None
        assert d["token"]
        # bcrypt $2b$ hash format
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {d['token']}"}, timeout=30)
        assert me.status_code == 200
        # duplicate email rejected
        dup = requests.post(f"{API}/auth/register",
                            json={"email": email, "password": "Passw0rd!23", "name": "TEST User"}, timeout=30)
        assert dup.status_code == 400
        # login works
        lg = requests.post(f"{API}/auth/login", json={"email": email, "password": "Passw0rd!23"}, timeout=30)
        assert lg.status_code == 200
        # new user has no company -> protected data endpoints 404
        nt = lg.json()["token"]
        dash = requests.get(f"{API}/dashboard", headers={"Authorization": f"Bearer {nt}"}, timeout=30)
        assert dash.status_code == 404

    def test_register_invalid_email(self):
        r = requests.post(f"{API}/auth/register",
                          json={"email": "not-an-email", "password": "x", "name": "y"}, timeout=30)
        assert r.status_code == 422

    def test_logout(self, token):
        r = requests.post(f"{API}/auth/logout", headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_bcrypt_hash_format(self):
        from pymongo import MongoClient
        c = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        dbn = os.environ.get("DB_NAME") or dotenv_values("/app/backend/.env").get("DB_NAME")
        u = c[dbn].users.find_one({"email": "owner@eracool.id"})
        assert u is not None
        assert u["password_hash"].startswith("$2b$"), u["password_hash"][:10]

    def test_brute_force_lockout(self, test_credentials):
        """Playbook expects lockout after 5 failed attempts."""
        codes = []
        for _ in range(6):
            r = requests.post(f"{API}/auth/login",
                              json={"email": test_credentials["email"], "password": "bad-pw-1"}, timeout=30)
            codes.append(r.status_code)
        assert 423 in codes or 429 in codes, f"No lockout enforced, codes={codes}"


# ---------------- protected endpoint auth guard ----------------
@pytest.mark.parametrize("path", [
    "/dashboard", "/financial/pnl", "/financial/balance-sheet", "/financial/cash-flow",
    "/financial/cash-on-hand", "/financial/ratios", "/kpi", "/jobs", "/accounts",
    "/audit-logs", "/company", "/transactions", "/reports/financial.pdf", "/reports/financial.xlsx",
])
def test_protected_requires_auth(path):
    r = requests.get(f"{API}{path}", timeout=30)
    assert r.status_code == 401, f"{path} -> {r.status_code}"


# ---------------- dashboard ----------------
class TestDashboard:
    def test_dashboard(self, client):
        r = client.get(f"{API}/dashboard", timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert len(d["kpi_cards"]) == 8
        cards = {c["key"]: c["value"] for c in d["kpi_cards"]}
        assert cards["revenue"] == pytest.approx(181230000, rel=0.001), cards["revenue"]
        assert cards["net_profit"] == pytest.approx(49169996, rel=0.001), cards["net_profit"]
        assert cards["net_margin"] == pytest.approx(27.13, abs=0.05), cards["net_margin"]
        assert cards["jobs"] == 120
        assert d["health_score"]["score"] == pytest.approx(94, abs=4), d["health_score"]
        assert "score" in d["data_quality"]
        assert len(d["revenue_series"]) == 12
        assert len(d["cash_flow_series"]) > 0
        assert len(d["alerts"]) > 0
        assert len(d["top_problems"]) == 3
        assert len(d["top_opportunities"]) == 3


# ---------------- financial statements ----------------
class TestFinancial:
    def test_pnl(self, client):
        r = client.get(f"{API}/financial/pnl", timeout=60)
        assert r.status_code == 200
        d = r.json()
        cur = d["current"]
        assert cur["revenue"] == pytest.approx(181230000, rel=0.001)
        assert cur["gross_profit"] == pytest.approx(cur["revenue"] - cur["cogs"], rel=0.001)
        assert cur["net_profit"] == pytest.approx(49169996, rel=0.001)
        assert len(d["series"]) == 12
        assert all("month" in s for s in d["series"])

    def test_pnl_month_filter(self, client):
        r = client.get(f"{API}/financial/pnl?months=1,2,3", timeout=60)
        assert r.status_code == 200
        d = r.json()
        full = client.get(f"{API}/financial/pnl", timeout=60).json()
        assert d["current"]["revenue"] < full["current"]["revenue"]
        assert d["current"]["revenue"] > 0

    def test_balance_sheet_balanced(self, client):
        r = client.get(f"{API}/financial/balance-sheet", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["balanced"] is True, d
        assert d["total_assets"] == pytest.approx(d["total_liabilities"] + d["total_equity"], abs=1.0)
        assert len(d["assets"]) > 0 and len(d["equity"]) > 0

    def test_cash_flow(self, client):
        r = client.get(f"{API}/financial/cash-flow", timeout=60)
        assert r.status_code == 200
        d = r.json()
        for k in ("beginning_cash", "operating", "investing", "financing", "ending_cash", "net_cash_flow"):
            assert k in d, k
        assert d["ending_cash"] == pytest.approx(
            d["beginning_cash"] + d["operating"] + d["investing"] + d["financing"], abs=1.0)
        assert len(d["series"]) == 12

    def test_cash_on_hand(self, client):
        r = client.get(f"{API}/financial/cash-on-hand", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "total_cash" in d
        assert d["total_cash"] > 0

    def test_ratios(self, client):
        r = client.get(f"{API}/financial/ratios", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "current_ratio" in d
        assert isinstance(d["current_ratio"], (int, float))

    def test_no_negative_asset_balances(self, client):
        """Only contra-assets (Accum. Depreciation) may be negative."""
        bs = client.get(f"{API}/financial/balance-sheet", timeout=60).json()
        bad = [a for a in bs["assets"] if a["amount"] < 0 and "Penyusutan" not in a["name"]]
        assert not bad, f"Negative asset balances (accounting error): {bad}"

    def test_quick_ratio_not_greater_than_current_ratio(self, client):
        r = client.get(f"{API}/financial/ratios", timeout=60).json()
        assert r["quick_ratio"] <= r["current_ratio"] + 0.001, (r["quick_ratio"], r["current_ratio"])

    def test_cash_on_hand_matches_cash_flow_ending(self, client):
        coh = client.get(f"{API}/financial/cash-on-hand", timeout=60).json()
        cf = client.get(f"{API}/financial/cash-flow", timeout=60).json()
        assert coh["total_cash"] == pytest.approx(cf["ending_cash"], abs=1.0), (coh["total_cash"], cf["ending_cash"])


# ---------------- kpi / jobs / accounts ----------------
class TestKpiJobs:
    def test_kpi(self, client):
        r = client.get(f"{API}/kpi", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "financial" in d and "service" in d
        assert isinstance(d["technicians"], list) and len(d["technicians"]) > 0
        assert isinstance(d["customers"], list) and len(d["customers"]) > 0
        assert d["service"]["total_jobs"] == 120
        assert d["health_score"]["score"] > 0

    def test_jobs(self, client):
        r = client.get(f"{API}/jobs", timeout=60)
        assert r.status_code == 200
        jobs = r.json()["jobs"]
        assert len(jobs) == 120
        j = jobs[0]
        for f in ("customer", "technician", "service_type", "revenue", "profit", "date"):
            assert f in j, f
        assert "_id" not in j
        # sorted desc by date
        dates = [x["date"] for x in jobs]
        assert dates == sorted(dates, reverse=True)

    def test_accounts(self, client):
        r = client.get(f"{API}/accounts", timeout=60)
        assert r.status_code == 200
        accts = r.json()["accounts"]
        assert len(accts) >= 20, len(accts)
        assert "_id" not in accts[0]
        assert "code" in accts[0] and "name" in accts[0]

    def test_transactions(self, client):
        r = client.get(f"{API}/transactions?limit=10", timeout=60)
        assert r.status_code == 200
        txs = r.json()["transactions"]
        assert len(txs) <= 10 and len(txs) > 0
        assert "_id" not in txs[0]

    def test_company(self, client):
        r = client.get(f"{API}/company", timeout=30)
        assert r.status_code == 200
        c = r.json()["company"]
        assert c["name"] == "CV Eracool Teknik Solution"
        assert c["currency"] == "IDR"
        assert "_id" not in c

    def test_audit_logs(self, client):
        r = client.get(f"{API}/audit-logs", timeout=30)
        assert r.status_code == 200
        logs = r.json()["logs"]
        assert isinstance(logs, list) and len(logs) > 0
        assert "action" in logs[0]


# ---------------- reports ----------------
class TestReports:
    def test_pdf(self, client):
        r = client.get(f"{API}/reports/financial.pdf", timeout=90)
        assert r.status_code == 200, r.text[:300]
        assert r.content[:4] == b"%PDF", r.content[:20]
        assert len(r.content) > 1000
        assert "attachment" in r.headers.get("content-disposition", "")

    def test_xlsx(self, client):
        r = client.get(f"{API}/reports/financial.xlsx", timeout=90)
        assert r.status_code == 200, r.text[:300]
        assert r.content[:2] == b"PK"
        assert len(r.content) > 1000


# ---------------- AI ----------------
class TestAI:
    def test_ai_ask(self, client):
        r = client.post(f"{API}/ai/ask", json={"question": "Berapa net margin kita dan apa artinya?"}, timeout=180)
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        for k in ("summary", "metrics", "findings", "risks", "recommendations", "confidence", "sources"):
            assert k in d, k
        assert isinstance(d["summary"], str) and len(d["summary"]) > 10, d
        blob = str(d)
        assert "27" in blob, f"AI answer does not reference real net margin: {blob[:400]}"

    def test_ai_insights(self, client):
        r = client.get(f"{API}/ai/insights", timeout=180)
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        assert len(d["summary"]) > 10
        assert len(d["recommendations"]) > 0 or len(d["findings"]) > 0

    def test_ai_ask_requires_auth(self):
        r = requests.post(f"{API}/ai/ask", json={"question": "x"}, timeout=30)
        assert r.status_code == 401

    def test_ai_ask_validation(self, client):
        r = client.post(f"{API}/ai/ask", json={}, timeout=60)
        assert r.status_code == 422


# ---------------- import flow ----------------
CSV_GOOD = """Tanggal,Deskripsi,Nominal,Tipe
2025-03-01,TEST Service AC Kantor,1500000,Pendapatan
2025-03-02,TEST Beli Freon,500000,Pengeluaran
"""

CSV_BAD = """Tanggal,Deskripsi,Nominal,Tipe
2025-03-01,TEST Valid Row,1000000,Pendapatan
not-a-date,TEST Bad Date,1000000,Pendapatan
2025-03-05,TEST Bad Amount,abc,Pengeluaran
2025-03-06,TEST Zero,0,Pengeluaran
"""


class TestImport:
    @pytest.fixture(autouse=True)
    def cleanup(self, client):
        yield
        client.delete(f"{API}/data/imported", timeout=60)

    def test_upload_csv(self, client):
        files = {"file": ("test_import.csv", io.BytesIO(CSV_GOOD.encode()), "text/csv")}
        r = client.post(f"{API}/import/upload", files=files, timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["columns"] == ["Tanggal", "Deskripsi", "Nominal", "Tipe"]
        assert d["row_count"] == 2
        assert len(d["preview"]) == 2
        sm = d["suggested_mapping"]
        assert sm.get("date") == "Tanggal"
        assert sm.get("amount") == "Nominal"
        assert sm.get("description") == "Deskripsi"
        assert sm.get("type") == "Tipe"

    def test_upload_bad_format(self, client):
        files = {"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")}
        r = client.post(f"{API}/import/upload", files=files, timeout=60)
        assert r.status_code == 400

    def test_commit_and_effect_on_pnl(self, client):
        before = client.get(f"{API}/financial/pnl", timeout=60).json()["current"]["revenue"]
        files = {"file": ("test_import.csv", io.BytesIO(CSV_GOOD.encode()), "text/csv")}
        up = client.post(f"{API}/import/upload", files=files, timeout=60).json()
        r = client.post(f"{API}/import/commit", json={
            "filename": "test_import.csv", "rows": up["preview"], "mapping": up["suggested_mapping"]}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["imported"] == 2
        assert d["skipped"] == 0
        after = client.get(f"{API}/financial/pnl", timeout=60).json()["current"]["revenue"]
        assert after == pytest.approx(before + 1500000, abs=1)
        # balance sheet stays balanced after import
        bs = client.get(f"{API}/financial/balance-sheet", timeout=60).json()
        assert bs["balanced"] is True
        # delete removes it
        dl = client.delete(f"{API}/data/imported", timeout=60)
        assert dl.status_code == 200
        assert dl.json()["deleted"] == 4
        restored = client.get(f"{API}/financial/pnl", timeout=60).json()["current"]["revenue"]
        assert restored == pytest.approx(before, abs=1)

    def test_commit_validation_errors(self, client):
        files = {"file": ("test_bad.csv", io.BytesIO(CSV_BAD.encode()), "text/csv")}
        up = client.post(f"{API}/import/upload", files=files, timeout=60).json()
        r = client.post(f"{API}/import/commit", json={
            "filename": "test_bad.csv", "rows": up["preview"], "mapping": up["suggested_mapping"]}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["imported"] == 1
        assert d["skipped"] == 3, d
        fields = {e["field"] for e in d["errors"]}
        assert "date" in fields and "amount" in fields

    def test_commit_missing_mapping(self, client):
        r = client.post(f"{API}/import/commit", json={
            "filename": "x.csv", "rows": [{"a": "1"}], "mapping": {"description": "a"}}, timeout=60)
        assert r.status_code == 400
