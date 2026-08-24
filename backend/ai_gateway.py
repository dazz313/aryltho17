"""AI Gateway. Only this module talks to the external AI provider.
It prepares a minimal, validated financial context and enforces a structured JSON schema.
The AI never computes authoritative numbers — it only explains the engine's output.
"""
import os
import json
import re
import financial_engine as fe
from emergentintegrations.llm.chat import LlmChat, UserMessage

AI_PROVIDER = "gemini"
AI_MODEL = "gemini-3-flash-preview"

SYSTEM_MESSAGE = """Anda adalah "EraCool AI Financial Analyst", seorang analis keuangan untuk bisnis jasa service AC di Indonesia.

PRINSIP UTAMA:
- Financial Engine yang menghitung. Anda hanya MENJELASKAN, menyelidiki, mendeteksi pola, dan merekomendasikan.
- Anda TIDAK BOLEH mengarang angka keuangan. Gunakan HANYA angka dari DATA KONTEKS yang diberikan.
- Anda TIDAK BOLEH menyatakan uang hilang atau fraud tanpa bukti rekonsiliasi.
- Jangan menganggap laba = kas.
- Jika data tidak cukup, jawab: "Data belum cukup untuk menyimpulkan."
- Jangan memberikan angka pajak final; sebut sebagai ESTIMASI.
- Gunakan Bahasa Indonesia yang sederhana dan mudah dipahami pemilik usaha (bukan akuntan).

FORMAT JAWABAN: Balas HANYA dengan JSON valid (tanpa markdown, tanpa ```), dengan struktur:
{
  "summary": "kesimpulan singkat 1-2 kalimat",
  "metrics": [{"label": "Net Margin", "value": "27.1%"}],
  "findings": ["temuan 1", "temuan 2"],
  "risks": ["risiko 1"],
  "recommendations": ["rekomendasi 1", "rekomendasi 2"],
  "confidence": "high|medium|low",
  "sources": ["Profit & Loss 2025", "KPI Engine"]
}
Setiap klaim penting harus merujuk ke sumber data di "sources"."""


def build_context(lines, jobs):
    """Minimal, relevant financial context (no PII beyond aggregate names)."""
    pnl = fe.profit_and_loss(lines)["current"]
    bs = fe.balance_sheet(lines)
    cf = fe.cash_flow(lines)
    r = fe.ratios(lines)
    k = fe.kpis(lines, jobs)
    hs = fe.health_score(lines)
    coh = fe.cash_on_hand(lines)
    return {
        "profit_and_loss": pnl,
        "balance_sheet": {k2: bs[k2] for k2 in ("total_assets", "total_liabilities", "total_equity", "balanced")},
        "cash_flow": cf,
        "ratios": r,
        "financial_kpi": k["financial"],
        "service_kpi": k["service"],
        "top_customers": k["customers"][:3],
        "top_technicians": k["technicians"][:3],
        "cash_position": coh,
        "financial_health_score": hs,
    }


def _extract_json(text):
    text = text.strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return None


def _fallback(text):
    return {
        "summary": text[:400] if text else "Data belum cukup untuk menyimpulkan.",
        "metrics": [], "findings": [], "risks": [],
        "recommendations": [], "confidence": "low", "sources": [],
    }


async def ask_finance_ai(question, lines, jobs, session_id="finance-ai"):
    context = build_context(lines, jobs)
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(api_key=api_key, session_id=session_id, system_message=SYSTEM_MESSAGE).with_model(AI_PROVIDER, AI_MODEL)
    prompt = f"""DATA KONTEKS KEUANGAN (angka otoritatif dari Financial Engine, IDR):
{json.dumps(context, ensure_ascii=False)}

PERTANYAAN PENGGUNA:
{question}

Jawab dalam format JSON sesuai instruksi sistem. Gunakan HANYA angka dari data konteks di atas."""
    msg = UserMessage(text=prompt)
    resp = await chat.send_message(msg)
    text = resp if isinstance(resp, str) else str(resp)
    parsed = _extract_json(text) or _fallback(text)
    # normalize
    parsed.setdefault("summary", "")
    for key in ("metrics", "findings", "risks", "recommendations", "sources"):
        if not isinstance(parsed.get(key), list):
            parsed[key] = []
    parsed.setdefault("confidence", "medium")
    return parsed


async def generate_insights(lines, jobs, session_id="ai-insights"):
    """Auto insights + recommendations for the dashboard."""
    return await ask_finance_ai(
        "Berikan analisis kesehatan bisnis secara menyeluruh: temuan utama, risiko, dan rekomendasi prioritas untuk bulan depan.",
        lines, jobs, session_id=session_id,
    )


def _normalize(parsed):
    parsed.setdefault("summary", "")
    for key in ("metrics", "findings", "risks", "recommendations", "sources"):
        if not isinstance(parsed.get(key), list):
            parsed[key] = []
    parsed.setdefault("confidence", "medium")
    return parsed


async def _ask_with_context(context_label, context, task, session_id):
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(api_key=api_key, session_id=session_id, system_message=SYSTEM_MESSAGE).with_model(AI_PROVIDER, AI_MODEL)
    prompt = f"""DATA KONTEKS ({context_label}) — angka otoritatif dari Financial Engine (IDR):
{json.dumps(context, ensure_ascii=False)}

TUGAS:
{task}

Jawab dalam format JSON sesuai instruksi sistem. Gunakan HANYA angka dari data konteks di atas."""
    resp = await chat.send_message(UserMessage(text=prompt))
    text = resp if isinstance(resp, str) else str(resp)
    return _normalize(_extract_json(text) or _fallback(text))


async def explain_reconciliation(recon, session_id="ai-recon"):
    task = ("Jelaskan penyebab selisih antara catatan buku (book) dan rekening koran bank (statement). "
            "Untuk setiap item yang tidak cocok, sebutkan BUKTINYA (tanggal, nominal, deskripsi). "
            "JANGAN menuduh kecurangan/uang hilang tanpa bukti rekonsiliasi — sebutkan kemungkinan sebab wajar "
            "(perbedaan waktu/timing, biaya administrasi bank, bunga, transaksi belum tercatat di buku). "
            "Masukkan setiap item tidak cocok beserta nominalnya ke dalam 'findings'. Beri langkah tindakan di 'recommendations'.")
    return await _ask_with_context("Rekonsiliasi Bank", recon, task, session_id)


async def explain_anomalies(anom, session_id="ai-anomaly"):
    task = ("Jelaskan anomali yang telah terdeteksi oleh engine. Urutkan berdasarkan dampak finansial, "
            "sertakan bukti angka untuk setiap anomali di 'findings', dan beri rekomendasi tindakan konkret di 'recommendations'. "
            "JANGAN menambah anomali yang tidak ada pada data. Jika tidak ada anomali, katakan bisnis stabil.")
    return await _ask_with_context("Deteksi Anomali", anom, task, session_id)


async def explain_tax(summary, task, session_id="ai-tax"):
    return await _ask_with_context("Ringkasan Pajak", summary, task, session_id)

