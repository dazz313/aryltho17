"""Complete financial statements per SAK EMKM.
Multi-step income statement, classified balance sheet, statement of changes in equity, notes.
All tie to the recorded ledger (pre-tax). Tax shown as estimate only."""
import financial_engine as fe
from demo_data import ACCT

CURRENT_ASSETS = ["1000", "1010", "1020", "1030", "1100", "1200", "1300"]
NONCURRENT_ASSETS = ["1500", "1600"]
CURRENT_LIAB = ["2000", "2100", "2200"]
NONCURRENT_LIAB = ["2300"]
EQUITY = ["3000", "3100"]

PPH_FINAL_RATE = 0.005


def _rp(v):
    return f"Rp{v:,.0f}"


def income_statement(lines):
    pnl = fe.profit_and_loss(lines)["current"]
    rows = pnl["rows"]
    pph_final = round(pnl["revenue"] * PPH_FINAL_RATE, 2)
    return {
        "revenue_rows": [r for r in rows if r["type"] == "revenue"],
        "revenue": pnl["revenue"],
        "cogs_rows": [r for r in rows if r["type"] == "cogs"],
        "cogs": pnl["cogs"],
        "gross_profit": pnl["gross_profit"],
        "gross_margin": pnl["gross_margin"],
        "opex_rows": [r for r in rows if r["type"] == "expense"],
        "operating_expense": pnl["operating_expense"],
        "operating_profit": pnl["operating_profit"],
        "other_income": 0.0, "other_expense": 0.0,
        "profit_before_tax": pnl["net_profit"],
        "net_margin": pnl["net_margin"],
        "estimated_tax_final": pph_final,
        "profit_after_tax": round(pnl["net_profit"] - pph_final, 2),
    }


def classified_balance_sheet(lines):
    bal = fe._acct_balances(lines)

    def rows(codes, contra_negate=True):
        out, total = [], 0.0
        for c in codes:
            a = ACCT[c]
            amt = round(bal.get(c, 0.0), 2)
            if a["type"] == "contra_asset" and contra_negate:
                amt = -amt
            total += amt
            if abs(amt) > 0.01:
                out.append({"code": c, "name": a["name"], "amount": amt})
        return out, round(total, 2)

    ca, ca_t = rows(CURRENT_ASSETS)
    nca, nca_t = rows(NONCURRENT_ASSETS)
    cl, cl_t = rows(CURRENT_LIAB)
    ncl, ncl_t = rows(NONCURRENT_LIAB)
    eq, eq_t = rows(EQUITY, contra_negate=False)
    net = round(fe.profit_and_loss(lines)["current"]["net_profit"], 2)
    eq.append({"code": "3200", "name": "Laba Tahun Berjalan (Current Year Profit)", "amount": net})
    eq_t = round(eq_t + net, 2)
    total_assets = round(ca_t + nca_t, 2)
    total_liab = round(cl_t + ncl_t, 2)
    return {
        "current_assets": ca, "current_assets_total": ca_t,
        "noncurrent_assets": nca, "noncurrent_assets_total": nca_t,
        "total_assets": total_assets,
        "current_liabilities": cl, "current_liabilities_total": cl_t,
        "noncurrent_liabilities": ncl, "noncurrent_liabilities_total": ncl_t,
        "total_liabilities": total_liab,
        "equity": eq, "total_equity": eq_t,
        "total_liabilities_equity": round(total_liab + eq_t, 2),
        "balanced": abs(total_assets - (total_liab + eq_t)) < 1.0,
    }


def changes_in_equity(lines):
    bal = fe._acct_balances(lines)
    modal = round(bal.get("3000", 0.0), 2)
    retained = round(bal.get("3100", 0.0), 2)
    net = round(fe.profit_and_loss(lines)["current"]["net_profit"], 2)
    prive = 0.0
    begin = round(modal + retained, 2)
    end = round(begin + net - prive, 2)
    return {"modal": modal, "retained_opening": retained, "beginning_equity": begin,
            "net_profit": net, "prive": prive, "ending_equity": end}


def notes(lines, company):
    coh = fe.cash_on_hand(lines)
    bs = classified_balance_sheet(lines)
    inv = next((a["amount"] for a in bs["current_assets"] if a["code"] == "1300"), 0)
    ar = next((a["amount"] for a in bs["current_assets"] if a["code"] == "1200"), 0)
    return [
        {"title": "1. Informasi Umum",
         "body": f"{company.get('name')} adalah entitas yang bergerak di bidang {company.get('industry')}. "
                 f"Laporan keuangan disajikan untuk periode tahun buku {company.get('fiscal_year')} dalam mata uang Rupiah (IDR)."},
        {"title": "2. Dasar Penyusunan",
         "body": "Laporan keuangan disusun sesuai Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM) "
                 "dengan menggunakan basis akrual."},
        {"title": "3. Kebijakan Akuntansi Signifikan",
         "body": "Pendapatan jasa diakui pada saat jasa selesai diserahkan kepada pelanggan. "
                 "Persediaan dinilai sebesar biaya perolehan (FIFO). "
                 "Aset tetap dicatat sebesar biaya perolehan dikurangi akumulasi penyusutan (metode garis lurus)."},
        {"title": "4. Kas, Bank, dan Piutang",
         "body": f"Total kas dan setara kas sebesar {_rp(coh['total_cash'])} (bank {_rp(coh['bank'])}, kas fisik {_rp(coh['cash_on_hand'])}). "
                 f"Piutang usaha sebesar {_rp(ar)}."},
        {"title": "5. Persediaan & Aset Tetap",
         "body": f"Persediaan material tercatat sebesar {_rp(inv)}. Aset tetap disajikan setelah dikurangi akumulasi penyusutan."},
        {"title": "6. Perpajakan",
         "body": "Entitas menggunakan skema PPh Final UMKM 0,5% dari peredaran bruto (PP 55/2022). "
                 "Estimasi kewajiban pajak disajikan pada modul Tax Center dan belum dibukukan sebagai kewajiban pada tanggal laporan."},
    ]


def complete(lines, company):
    return {
        "income_statement": income_statement(lines),
        "balance_sheet": classified_balance_sheet(lines),
        "changes_in_equity": changes_in_equity(lines),
        "cash_flow": fe.cash_flow(lines),
        "notes": notes(lines, company),
        "meta": {"name": company.get("name"), "fiscal_year": company.get("fiscal_year"),
                 "standard": "SAK EMKM", "currency": "IDR"},
    }
