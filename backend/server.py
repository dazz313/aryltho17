from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import pandas as pd

import auth as A
from models import RegisterRequest, LoginRequest, CompanySetup, MappingConfirm, AskAIRequest
from demo_data import CHART_OF_ACCOUNTS, generate_demo_lines, ACCT
import financial_engine as fe
import analytics as an
import tax_center as tax
import statements as stmt
import storage as store
import ai_gateway as ai

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="EraCool AI Financial Analyst")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("eracool")

VALID_ROLES = {"owner", "finance", "accountant"}


# ---------------- helpers ----------------
async def current_user(request: Request):
    return await A.get_current_user(request, db)


async def audit(company_id, user, action, meta=None):
    await db.audit_logs.insert_one({
        "company_id": company_id, "user_email": user.get("email") if user else None,
        "user_name": user.get("name") if user else None, "action": action,
        "meta": meta or {}, "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def get_company(user):
    cid = user.get("company_id")
    if not cid:
        raise HTTPException(status_code=404, detail="Belum ada perusahaan. Silakan setup terlebih dahulu.")
    company = await db.companies.find_one({"_id": _oid(cid)})
    if not company:
        raise HTTPException(status_code=404, detail="Perusahaan tidak ditemukan")
    company["id"] = str(company["_id"])
    company.pop("_id", None)
    return company


def _oid(v):
    from bson import ObjectId
    return ObjectId(v)


async def load_data(company_id):
    lines = await db.journal_lines.find({"company_id": company_id}, {"_id": 0}).to_list(200000)
    jobs = await db.service_jobs.find({"company_id": company_id}, {"_id": 0}).to_list(50000)
    return lines, jobs


async def seed_company_data(company_id, fiscal_year=2025):
    await db.journal_lines.delete_many({"company_id": company_id})
    await db.service_jobs.delete_many({"company_id": company_id})
    lines, jobs = generate_demo_lines(company_id, fiscal_year)
    for l in lines:
        l["company_id"] = company_id
    for j in jobs:
        j["company_id"] = company_id
    if lines:
        await db.journal_lines.insert_many(lines)
    if jobs:
        await db.service_jobs.insert_many(jobs)
    # chart of accounts
    await db.accounts.delete_many({"company_id": company_id})
    await db.accounts.insert_many([{**a, "company_id": company_id} for a in CHART_OF_ACCOUNTS])
    # prior-year comparison series for YoY
    prior_year = an.build_prior_year(lines)
    await db.companies.update_one({"_id": _oid(company_id)},
                                  {"$set": {"prior_year": prior_year}})


# ---------------- auth ----------------
@api.post("/auth/register")
async def register(body: RegisterRequest, response: Response):
    email = body.email.lower()
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    role = body.role if body.role in VALID_ROLES else "owner"
    doc = {"email": email, "password_hash": A.hash_password(body.password), "name": body.name,
           "role": role, "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    access = A.create_access_token(uid, email)
    A.set_auth_cookies(response, access, A.create_refresh_token(uid))
    return {"id": uid, "email": email, "name": body.name, "role": role, "company_id": None, "token": access}


@api.post("/auth/login")
async def login(body: LoginRequest, response: Response):
    email = body.email.lower()
    now = datetime.now(timezone.utc)
    attempt = await db.login_attempts.find_one({"email": email})
    if attempt and attempt.get("locked_until"):
        locked_until = datetime.fromisoformat(attempt["locked_until"])
        if locked_until > now:
            raise HTTPException(status_code=429, detail="Terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.")
    user = await db.users.find_one({"email": email})
    if not user or not A.verify_password(body.password, user["password_hash"]):
        count = (attempt.get("count", 0) if attempt else 0) + 1
        update = {"count": count, "last": now.isoformat()}
        if count >= 5:
            update["locked_until"] = (now + timedelta(minutes=15)).isoformat()
            update["count"] = 0
        await db.login_attempts.update_one({"email": email}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Email atau password salah")
    await db.login_attempts.delete_one({"email": email})
    uid = str(user["_id"])
    access = A.create_access_token(uid, email)
    A.set_auth_cookies(response, access, A.create_refresh_token(uid))
    await audit(user.get("company_id"), {"email": email, "name": user.get("name")}, "login")
    return {"id": uid, "email": email, "name": user["name"], "role": user["role"],
            "company_id": user.get("company_id"), "token": access}


@api.post("/auth/logout")
async def logout(response: Response, user=Depends(current_user)):
    A.clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    import jwt
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Tidak ada refresh token")
    try:
        payload = jwt.decode(token, A.get_jwt_secret(), algorithms=[A.JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token tidak valid")
        response.set_cookie("access_token", A.create_access_token(payload["sub"], ""), httponly=True,
                            secure=True, samesite="none", max_age=60 * 60 * 12, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")


# ---------------- company ----------------
@api.get("/company")
async def company_get(user=Depends(current_user)):
    if not user.get("company_id"):
        return {"company": None}
    return {"company": await get_company(user)}


@api.post("/company/setup")
async def company_setup(body: CompanySetup, user=Depends(current_user)):
    doc = {**body.model_dump(), "owner_email": user["email"],
           "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.companies.insert_one(doc)
    cid = str(res.inserted_id)
    await db.users.update_one({"email": user["email"]}, {"$set": {"company_id": cid}})
    await audit(cid, user, "company_setup", {"name": body.name})
    return {"company_id": cid, "seeded": False}


# ---------------- financial engine ----------------
def _parse_months(months: Optional[str]):
    if not months:
        return None
    return [int(m) for m in months.split(",") if m.strip().isdigit()]


@api.get("/dashboard")
async def dashboard(user=Depends(current_user)):
    company = await get_company(user)
    lines, jobs = await load_data(company["id"])
    pnl = fe.profit_and_loss(lines)
    bs = fe.balance_sheet(lines)
    cf = fe.cash_flow(lines)
    coh = fe.cash_on_hand(lines)
    k = fe.kpis(lines, jobs)
    hs = fe.health_score(lines)
    dq = fe.data_quality(lines, jobs)
    r = fe.ratios(lines)

    ar = next((a["amount"] for a in bs["assets"] if a["code"] == "1200"), 0)
    cur = pnl["current"]
    kpi_cards = [
        {"key": "revenue", "label": "Revenue (Omzet)", "value": cur["revenue"], "format": "currency"},
        {"key": "net_profit", "label": "Net Profit (Laba Bersih)", "value": cur["net_profit"], "format": "currency"},
        {"key": "net_margin", "label": "Net Margin", "value": cur["net_margin"], "format": "percent"},
        {"key": "cash", "label": "Total Cash (Kas & Bank)", "value": coh["total_cash"], "format": "currency"},
        {"key": "receivables", "label": "Receivables (Piutang)", "value": ar, "format": "currency"},
        {"key": "expenses", "label": "Expenses (Total Beban)", "value": round(cur["cogs"] + cur["operating_expense"], 2), "format": "currency"},
        {"key": "jobs", "label": "Service Jobs", "value": k["service"]["total_jobs"], "format": "number"},
        {"key": "avg_invoice", "label": "Average Invoice", "value": k["service"]["average_invoice"], "format": "currency"},
    ]

    alerts = []
    if r["current_ratio"] >= 2:
        alerts.append({"level": "green", "text": f"Likuiditas sangat kuat (Current Ratio {r['current_ratio']}x)."})
    if ar > 0:
        alerts.append({"level": "yellow", "text": f"Piutang usaha Rp{ar:,.0f} perlu ditindaklanjuti untuk menjaga arus kas."})
    if cur["net_margin"] > 20:
        alerts.append({"level": "green", "text": f"Net margin sehat di {cur['net_margin']}%."})
    if cf["operating"] < 0:
        alerts.append({"level": "red", "text": "Arus kas operasi negatif, perlu perhatian."})

    return {
        "kpi_cards": kpi_cards, "health_score": hs, "data_quality": dq,
        "revenue_series": pnl["series"], "cash_flow_series": cf["series"],
        "alerts": alerts,
        "top_problems": [
            f"Konsentrasi pelanggan {k['customer']['customer_concentration']}% pada satu customer.",
            f"Piutang usaha Rp{ar:,.0f} belum tertagih.",
            "Biaya tenaga kerja langsung menyerap porsi signifikan dari revenue.",
        ],
        "top_opportunities": [
            f"Net margin {cur['net_margin']}% di atas rata-rata industri jasa.",
            "Repeat customer dapat ditingkatkan dengan program maintenance berkala.",
            "Efisiensi biaya transport dapat menaikkan profit per job.",
        ],
    }


@api.get("/financial/pnl")
async def api_pnl(months: Optional[str] = None, user=Depends(current_user)):
    company = await get_company(user)
    lines, _ = await load_data(company["id"])
    ml = _parse_months(months)
    prev = None
    return fe.profit_and_loss(lines, months=ml, prev_months=prev)


@api.get("/financial/pnl-compare")
async def api_pnl_compare(period: str = "FY", user=Depends(current_user)):
    company = await get_company(user)
    lines, _ = await load_data(company["id"])
    prior = company.get("prior_year")
    if not prior:
        prior = an.build_prior_year(lines)
        await db.companies.update_one({"_id": _oid(company["id"])}, {"$set": {"prior_year": prior}})
    return an.period_pnl(lines, prior, period)


# ---------------- anomaly detection ----------------
@api.get("/anomalies")
async def api_anomalies(user=Depends(current_user)):
    company = await get_company(user)
    lines, jobs = await load_data(company["id"])
    return an.detect_anomalies(lines, jobs)


@api.get("/ai/anomaly-insights")
async def api_anomaly_insights(user=Depends(current_user)):
    company = await get_company(user)
    lines, jobs = await load_data(company["id"])
    result = an.detect_anomalies(lines, jobs)
    ai_expl = await ai.explain_anomalies(result, session_id=f"anomaly-{company['id']}")
    await audit(company["id"], user, "ai_anomaly")
    return {"detection": result, "ai": ai_expl}


# ---------------- bank reconciliation ----------------
@api.get("/reconciliation/demo")
async def api_recon_demo(month: int = 6, user=Depends(current_user)):
    company = await get_company(user)
    lines, _ = await load_data(company["id"])
    book = an.bank_movements(lines, month=month)
    statement, dropped = an.demo_statement(book)
    result = an.reconcile(book, statement)
    return {"month": month, "statement": statement, "result": result,
            "note": "Data rekening koran demo dibuat dari catatan buku dengan selisih realistis (biaya admin, bunga, transaksi timing)."}


@api.post("/reconciliation/upload")
async def api_recon_upload(file: UploadFile = File(...), user=Depends(current_user)):
    company = await get_company(user)
    lines, _ = await load_data(company["id"])
    content = await file.read()
    name = (file.filename or "").lower()
    try:
        if name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif name.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Format tidak didukung. Gunakan XLSX atau CSV.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file: {e}")
    df = df.fillna("")
    cols = {str(c).lower(): str(c) for c in df.columns}
    dcol = next((cols[c] for c in cols if any(k in c for k in ("date", "tanggal", "tgl"))), None)
    acol = next((cols[c] for c in cols if any(k in c for k in ("amount", "nominal", "jumlah", "nilai", "mutasi"))), None)
    ncol = next((cols[c] for c in cols if any(k in c for k in ("desc", "keterangan", "uraian"))), None)
    if not dcol or not acol:
        raise HTTPException(status_code=400, detail="File harus punya kolom Tanggal dan Nominal/Mutasi.")
    statement = []
    for _, row in df.iterrows():
        raw_d = str(row[dcol])[:10]
        date = None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                from datetime import datetime as _dt
                date = _dt.strptime(raw_d, fmt).strftime("%Y-%m-%d")
                break
            except Exception:
                continue
        if not date:
            continue
        try:
            amt = float(str(row[acol]).replace("Rp", "").replace(".", "").replace(",", "").replace(" ", ""))
        except Exception:
            continue
        statement.append({"date": date, "description": str(row[ncol]) if ncol else "Mutasi", "amount": round(amt, 2)})
    book = an.bank_movements(lines)
    result = an.reconcile(book, statement)
    await audit(company["id"], user, "reconciliation_upload", {"filename": file.filename, "difference": result["difference"]})
    return {"statement": statement[:200], "result": result}


@api.post("/ai/reconciliation-explain")
async def api_recon_explain(body: dict, user=Depends(current_user)):
    company = await get_company(user)
    result = body.get("result") or {}
    ai_expl = await ai.explain_reconciliation(an.compact_recon(result), session_id=f"recon-{company['id']}")
    return ai_expl


# ---------------- tax center ----------------
@api.get("/tax/summary")
async def api_tax_summary(pkp: bool = False, user=Depends(current_user)):
    company = await get_company(user)
    lines, _ = await load_data(company["id"])
    return tax.compute(lines, pkp=pkp)


@api.get("/ai/tax-advice")
async def api_tax_advice(pkp: bool = False, user=Depends(current_user)):
    company = await get_company(user)
    lines, _ = await load_data(company["id"])
    summary = tax.compute(lines, pkp=pkp)
    task = ("Jelaskan situasi pajak bisnis ini dengan bahasa sederhana. Bandingkan PPh Final UMKM 0,5% vs PPh Badan Tarif Umum, "
            "rekomendasikan yang paling hemat beserta alasannya, dan sebutkan kewajiban bulanan yang harus dibayar. "
            "Gunakan HANYA angka dari data konteks. Ingatkan bahwa ini estimasi, bukan perhitungan pajak final.")
    ai_expl = await ai.explain_tax(summary, task, session_id=f"tax-{company['id']}")
    await audit(company["id"], user, "ai_tax")
    return {"summary": summary, "ai": ai_expl}


# ---------------- complete statements (SAK EMKM) ----------------
@api.get("/statements/complete")
async def api_statements_complete(user=Depends(current_user)):
    company = await get_company(user)
    lines, _ = await load_data(company["id"])
    return stmt.complete(lines, company)


@api.get("/financial/balance-sheet")
async def api_bs(user=Depends(current_user)):
    company = await get_company(user)
    lines, _ = await load_data(company["id"])
    return fe.balance_sheet(lines)


@api.get("/financial/cash-flow")
async def api_cf(user=Depends(current_user)):
    company = await get_company(user)
    lines, _ = await load_data(company["id"])
    return fe.cash_flow(lines)


@api.get("/financial/ratios")
async def api_ratios(user=Depends(current_user)):
    company = await get_company(user)
    lines, _ = await load_data(company["id"])
    return fe.ratios(lines)


@api.get("/financial/cash-on-hand")
async def api_coh(user=Depends(current_user)):
    company = await get_company(user)
    lines, _ = await load_data(company["id"])
    return fe.cash_on_hand(lines)


@api.get("/kpi")
async def api_kpi(user=Depends(current_user)):
    company = await get_company(user)
    lines, jobs = await load_data(company["id"])
    k = fe.kpis(lines, jobs)
    k["health_score"] = fe.health_score(lines)
    return k


@api.get("/accounts")
async def api_accounts(user=Depends(current_user)):
    company = await get_company(user)
    accts = await db.accounts.find({"company_id": company["id"]}, {"_id": 0}).to_list(1000)
    return {"accounts": accts}


@api.get("/transactions")
async def api_transactions(limit: int = 100, account: Optional[str] = None, user=Depends(current_user)):
    company = await get_company(user)
    q = {"company_id": company["id"]}
    if account:
        q["account_code"] = account
    q["$or"] = [{"debit": {"$gt": 0}}, {"credit": {"$gt": 0}}]
    txs = await db.journal_lines.find(q, {"_id": 0}).sort("date", -1).to_list(limit)
    return {"transactions": txs}


@api.get("/jobs")
async def api_jobs(user=Depends(current_user)):
    company = await get_company(user)
    _, jobs = await load_data(company["id"])
    jobs.sort(key=lambda x: x["date"], reverse=True)
    return {"jobs": jobs}


# ---------------- AI ----------------
@api.post("/ai/ask")
async def api_ai_ask(body: AskAIRequest, user=Depends(current_user)):
    company = await get_company(user)
    lines, jobs = await load_data(company["id"])
    result = await ai.ask_finance_ai(body.question, lines, jobs, session_id=body.session_id or company["id"])
    await audit(company["id"], user, "ai_ask", {"question": body.question})
    return result


@api.get("/ai/insights")
async def api_ai_insights(user=Depends(current_user)):
    company = await get_company(user)
    lines, jobs = await load_data(company["id"])
    result = await ai.generate_insights(lines, jobs, session_id=f"insights-{company['id']}")
    return result


# ---------------- import ----------------
FIELD_KEYWORDS = {
    "date": ["date", "tanggal", "tgl"],
    "description": ["description", "keterangan", "deskripsi", "uraian", "nama"],
    "amount": ["amount", "jumlah", "nominal", "nilai", "total", "rp"],
    "type": ["type", "tipe", "jenis", "kategori", "category"],
}


@api.post("/import/upload")
async def import_upload(file: UploadFile = File(...), user=Depends(current_user)):
    await get_company(user)
    content = await file.read()
    name = (file.filename or "").lower()
    try:
        if name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif name.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Format tidak didukung. Gunakan XLSX atau CSV.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file: {e}")

    df = df.fillna("")
    columns = [str(c) for c in df.columns]
    all_rows = df.head(5000).astype(str).to_dict(orient="records")
    preview = all_rows[:20]

    suggested = {}
    for field, kws in FIELD_KEYWORDS.items():
        for col in columns:
            if any(kw in col.lower() for kw in kws):
                suggested[field] = col
                break
    return {"filename": file.filename, "columns": columns, "preview": preview, "rows": all_rows,
            "row_count": len(df), "suggested_mapping": suggested}


def _validate_rows(rows, mapping):
    errors = []
    valid = []
    for i, row in enumerate(rows):
        rownum = i + 1
        raw_date = str(row.get(mapping.get("date", ""), "")).strip()
        raw_amount = str(row.get(mapping.get("amount", ""), "")).strip()
        desc = str(row.get(mapping.get("description", ""), "")).strip()
        rtype = str(row.get(mapping.get("type", ""), "")).strip().lower()
        # date
        date = None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"):
            try:
                date = datetime.strptime(raw_date[:10], fmt).strftime("%Y-%m-%d")
                break
            except Exception:
                continue
        if not date:
            errors.append({"row": rownum, "field": "date", "message": f"Tanggal tidak valid: '{raw_date}'"})
            continue
        # amount
        cleaned = raw_amount.replace("Rp", "").replace(".", "").replace(",", "").replace(" ", "")
        try:
            amount = float(cleaned)
        except Exception:
            errors.append({"row": rownum, "field": "amount", "message": f"Nominal tidak valid: '{raw_amount}'"})
            continue
        if amount <= 0:
            errors.append({"row": rownum, "field": "amount", "message": "Nominal harus lebih dari 0"})
            continue
        is_income = any(k in rtype for k in ["income", "pendapatan", "masuk", "in", "revenue", "kredit"])
        valid.append({"date": date, "description": desc or "Transaksi impor", "amount": amount,
                      "type": "income" if is_income else "expense"})
    return valid, errors


@api.post("/import/commit")
async def import_commit(body: MappingConfirm, user=Depends(current_user)):
    company = await get_company(user)
    if not body.mapping.get("date") or not body.mapping.get("amount"):
        raise HTTPException(status_code=400, detail="Kolom Tanggal dan Nominal wajib dipetakan.")
    valid, errors = _validate_rows(body.rows, body.mapping)
    if errors and not valid:
        raise HTTPException(status_code=400, detail={"message": "Semua baris gagal divalidasi", "errors": errors})

    lines = []
    eid_base = f"IMP-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    for i, v in enumerate(valid):
        eid = f"{eid_base}-{i+1}"
        if v["type"] == "income":
            lines.append(_mk_line(company["id"], eid, v["date"], "1100", v["amount"], 0, v["description"], "imported"))
            lines.append(_mk_line(company["id"], eid, v["date"], "4000", 0, v["amount"], v["description"], "imported"))
        else:
            lines.append(_mk_line(company["id"], eid, v["date"], "6500", v["amount"], 0, v["description"], "imported"))
            lines.append(_mk_line(company["id"], eid, v["date"], "1100", 0, v["amount"], v["description"], "imported"))
    if lines:
        await db.journal_lines.insert_many(lines)
    await audit(company["id"], user, "import_commit",
                {"filename": body.filename, "imported": len(valid), "errors": len(errors)})
    return {"imported": len(valid), "skipped": len(errors), "errors": errors[:50]}


def _mk_line(company_id, eid, date, code, debit, credit, desc, source):
    a = ACCT[code]
    return {"company_id": company_id, "entry_id": eid, "date": date, "account_code": code,
            "account_name": a["name"], "account_type": a["type"], "debit": round(debit, 2),
            "credit": round(credit, 2), "description": desc, "is_cash": a.get("cash", False),
            "cash_kind": a.get("cash_kind"), "is_bank": a.get("bank", False), "source": source}


@api.delete("/data/imported")
async def delete_imported(user=Depends(current_user)):
    company = await get_company(user)
    res = await db.journal_lines.delete_many({"company_id": company["id"], "source": "imported"})
    await audit(company["id"], user, "delete_imported", {"deleted": res.deleted_count})
    return {"deleted": res.deleted_count}


# ---------------- reports ----------------
def _fmt(n):
    return f"Rp{n:,.0f}"


@api.get("/reports/financial.xlsx")
async def report_xlsx(user=Depends(current_user)):
    from openpyxl import Workbook
    company = await get_company(user)
    lines, jobs = await load_data(company["id"])
    pnl = fe.profit_and_loss(lines)["current"]
    bs = fe.balance_sheet(lines)
    wb = Workbook()
    ws = wb.active
    ws.title = "Profit & Loss"
    ws.append(["EraCool AI Financial Analyst - Laporan Keuangan", company["name"]])
    ws.append([])
    ws.append(["Profit & Loss"])
    for r in pnl["rows"]:
        ws.append([r["name"], r["amount"]])
    ws.append(["Net Profit", pnl["net_profit"]])
    ws2 = wb.create_sheet("Balance Sheet")
    ws2.append(["Assets"])
    for a in bs["assets"]:
        ws2.append([a["name"], a["amount"]])
    ws2.append(["Liabilities"])
    for a in bs["liabilities"]:
        ws2.append([a["name"], a["amount"]])
    ws2.append(["Equity"])
    for a in bs["equity"]:
        ws2.append([a["name"], a["amount"]])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    await audit(company["id"], user, "export_xlsx")
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=laporan_keuangan.xlsx"})


@api.get("/reports/financial.pdf")
async def report_pdf(user=Depends(current_user)):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    company = await get_company(user)
    lines, jobs = await load_data(company["id"])
    pnl = fe.profit_and_loss(lines)["current"]
    hs = fe.health_score(lines)
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    y = h - 25 * mm
    c.setFont("Helvetica-Bold", 16)
    c.drawString(20 * mm, y, "EraCool AI Financial Analyst")
    y -= 8 * mm
    c.setFont("Helvetica", 11)
    c.drawString(20 * mm, y, f"{company['name']} - Laporan Keuangan {company.get('fiscal_year', '')}")
    y -= 12 * mm
    c.setFont("Helvetica-Bold", 13)
    c.drawString(20 * mm, y, "Profit & Loss")
    y -= 8 * mm
    c.setFont("Helvetica", 10)
    for label, val in [("Revenue", pnl["revenue"]), ("COGS", pnl["cogs"]),
                       ("Gross Profit", pnl["gross_profit"]), ("Operating Expense", pnl["operating_expense"]),
                       ("Net Profit", pnl["net_profit"]), ("Net Margin", f"{pnl['net_margin']}%")]:
        v = _fmt(val) if isinstance(val, (int, float)) else val
        c.drawString(22 * mm, y, f"{label}")
        c.drawRightString(w - 20 * mm, y, str(v))
        y -= 7 * mm
    y -= 6 * mm
    c.setFont("Helvetica-Bold", 13)
    c.drawString(20 * mm, y, f"Financial Health Score: {hs['score']}/100 ({hs['status']})")
    c.showPage()
    c.save()
    buf.seek(0)
    await audit(company["id"], user, "export_pdf")
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": "attachment; filename=laporan_keuangan.pdf"})


# ---------------- file & media storage ----------------
ALLOWED_EXT = {"jpg", "jpeg", "png", "webp", "gif", "pdf", "csv", "xlsx", "xls"}
MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif",
              "webp": "image/webp", "pdf": "application/pdf", "csv": "text/csv",
              "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "xls": "application/vnd.ms-excel"}
MAX_FILE_SIZE = 10 * 1024 * 1024


def _file_public(doc):
    return {k: doc[k] for k in ("id", "category", "attached_to", "attached_type", "original_filename",
                                "content_type", "size", "created_at", "uploaded_by") if k in doc}


@api.post("/files/upload")
async def upload_file(file: UploadFile = File(...), category: str = Form("document"),
                      attached_to: Optional[str] = Form(None), attached_type: Optional[str] = Form(None),
                      user=Depends(current_user)):
    company = await get_company(user)
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Tipe file tidak didukung. Diperbolehkan: {', '.join(sorted(ALLOWED_EXT))}")
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Ukuran file melebihi 10MB.")
    fid = str(uuid.uuid4())
    path = f"{store.APP_NAME}/{company['id']}/{category}/{fid}.{ext}"
    content_type = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
    try:
        result = store.put_object(path, data, content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=502, detail="Gagal mengunggah file ke storage.")
    doc = {
        "id": fid, "company_id": company["id"], "storage_path": result["path"],
        "category": category, "attached_to": attached_to, "attached_type": attached_type,
        "original_filename": file.filename, "content_type": content_type,
        "size": result.get("size", len(data)), "is_deleted": False,
        "uploaded_by": user.get("name") or user.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.files.insert_one(doc)
    await audit(company["id"], user, "file_upload", {"filename": file.filename, "category": category})
    return _file_public(doc)


@api.get("/files")
async def list_files(category: Optional[str] = None, attached_to: Optional[str] = None, user=Depends(current_user)):
    company = await get_company(user)
    q = {"company_id": company["id"], "is_deleted": False}
    if category:
        q["category"] = category
    if attached_to:
        q["attached_to"] = attached_to
    docs = await db.files.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"files": [_file_public(d) for d in docs]}


@api.get("/files/{file_id}/download")
async def download_file(file_id: str, user=Depends(current_user)):
    company = await get_company(user)
    rec = await db.files.find_one({"id": file_id, "company_id": company["id"], "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    try:
        data, ct = store.get_object(rec["storage_path"])
    except Exception as e:
        logger.error(f"Download failed: {e}")
        raise HTTPException(status_code=502, detail="Gagal mengambil file dari storage.")
    return Response(content=data, media_type=rec.get("content_type", ct),
                    headers={"Content-Disposition": f'inline; filename="{rec.get("original_filename","file")}"'})


@api.delete("/files/{file_id}")
async def delete_file(file_id: str, user=Depends(current_user)):
    company = await get_company(user)
    res = await db.files.update_one({"id": file_id, "company_id": company["id"]},
                                    {"$set": {"is_deleted": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    await audit(company["id"], user, "file_delete", {"file_id": file_id})
    return {"deleted": True}


@api.post("/company/logo")
async def upload_logo(file: UploadFile = File(...), user=Depends(current_user)):
    company = await get_company(user)
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in {"jpg", "jpeg", "png", "webp"}:
        raise HTTPException(status_code=400, detail="Logo harus berupa gambar (PNG/JPG/WEBP).")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ukuran logo maksimal 5MB.")
    fid = str(uuid.uuid4())
    path = f"{store.APP_NAME}/{company['id']}/logo/{fid}.{ext}"
    content_type = file.content_type or MIME_TYPES.get(ext, "image/png")
    try:
        result = store.put_object(path, data, content_type)
    except Exception as e:
        logger.error(f"Logo upload failed: {e}")
        raise HTTPException(status_code=502, detail="Gagal mengunggah logo.")
    doc = {"id": fid, "company_id": company["id"], "storage_path": result["path"], "category": "logo",
           "attached_to": None, "attached_type": None, "original_filename": file.filename,
           "content_type": content_type, "size": result.get("size", len(data)), "is_deleted": False,
           "uploaded_by": user.get("name") or user.get("email"),
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.files.insert_one(doc)
    await db.companies.update_one({"_id": _oid(company["id"])}, {"$set": {"logo_file_id": fid}})
    await audit(company["id"], user, "logo_upload")
    return {"logo_file_id": fid}


@api.get("/audit-logs")
async def audit_logs(user=Depends(current_user)):
    company = await get_company(user)
    logs = await db.audit_logs.find({"company_id": company["id"]}, {"_id": 0}).sort("timestamp", -1).to_list(200)
    return {"logs": logs}


@api.get("/")
async def root():
    return {"message": "EraCool AI Financial Analyst API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.journal_lines.create_index("company_id")
    await db.service_jobs.create_index("company_id")
    await db.files.create_index("company_id")
    try:
        store.init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await A.seed_admin(db)
    # ensure owner has a company (empty — no demo data)
    owner = await db.users.find_one({"email": os.environ.get("ADMIN_EMAIL", "owner@eracool.id")})
    if owner and not owner.get("company_id"):
        res = await db.companies.insert_one({
            "name": "CV Eracool Teknik Solution", "industry": "AC / Refrigeration Service",
            "accounting_method": "Accrual", "currency": "IDR", "fiscal_year": 2025,
            "owner_email": owner["email"], "created_at": datetime.now(timezone.utc).isoformat(),
        })
        cid = str(res.inserted_id)
        await db.users.update_one({"_id": owner["_id"]}, {"$set": {"company_id": cid}})
        logger.info("Created empty company for owner")


@app.on_event("shutdown")
async def shutdown():
    client.close()
