"""Chart of Accounts + deterministic demo data generator (EraCool 2025).
Every journal entry is balanced (debit == credit) so the Balance Sheet always balances.
"""
import random

# code: (name, type, extra)
# type: asset | contra_asset | liability | equity | revenue | cogs | expense
CHART_OF_ACCOUNTS = [
    # Assets
    {"code": "1000", "name": "Kas Kantor (Office Cash)", "type": "asset", "cash": True, "cash_kind": "office"},
    {"code": "1010", "name": "Kas Kecil (Petty Cash)", "type": "asset", "cash": True, "cash_kind": "petty"},
    {"code": "1020", "name": "Kas Teknisi (Technician Cash)", "type": "asset", "cash": True, "cash_kind": "technician"},
    {"code": "1030", "name": "Kas Proyek (Project Cash)", "type": "asset", "cash": True, "cash_kind": "project"},
    {"code": "1100", "name": "Bank BCA", "type": "asset", "cash": True, "cash_kind": "bank", "bank": True},
    {"code": "1200", "name": "Piutang Usaha (Accounts Receivable)", "type": "asset"},
    {"code": "1300", "name": "Persediaan (Inventory)", "type": "asset"},
    {"code": "1500", "name": "Aset Tetap (Fixed Assets)", "type": "asset"},
    {"code": "1600", "name": "Akumulasi Penyusutan (Accum. Depreciation)", "type": "contra_asset"},
    # Liabilities
    {"code": "2000", "name": "Utang Usaha (Accounts Payable)", "type": "liability"},
    {"code": "2100", "name": "Utang Pajak (Tax Payable)", "type": "liability"},
    {"code": "2200", "name": "Utang Gaji (Payroll Payable)", "type": "liability"},
    {"code": "2300", "name": "Utang Bank (Bank Loan)", "type": "liability"},
    # Equity
    {"code": "3000", "name": "Modal Pemilik (Owner Equity)", "type": "equity"},
    {"code": "3100", "name": "Laba Ditahan (Retained Earnings)", "type": "equity"},
    # Revenue
    {"code": "4000", "name": "Pendapatan Jasa Service AC (Service Revenue)", "type": "revenue"},
    # COGS
    {"code": "5000", "name": "Beban Pokok - Material (COGS Material)", "type": "cogs"},
    {"code": "5100", "name": "Beban Pokok - Tenaga Kerja (COGS Labor)", "type": "cogs"},
    # Operating Expenses
    {"code": "6000", "name": "Beban Gaji (Salary Expense)", "type": "expense"},
    {"code": "6100", "name": "Beban Transport (Transport Expense)", "type": "expense"},
    {"code": "6200", "name": "Beban Sewa (Rent Expense)", "type": "expense"},
    {"code": "6300", "name": "Beban Utilitas (Utilities Expense)", "type": "expense"},
    {"code": "6400", "name": "Beban Pemasaran (Marketing Expense)", "type": "expense"},
    {"code": "6500", "name": "Beban Administrasi (Admin Expense)", "type": "expense"},
    {"code": "6600", "name": "Beban Penyusutan (Depreciation Expense)", "type": "expense"},
]

ACCT = {a["code"]: a for a in CHART_OF_ACCOUNTS}

CUSTOMERS = [
    "PT Sejuk Abadi", "Hotel Grand Merdeka", "Ruko Sinar Jaya", "Apartemen Green Park",
    "CV Mitra Dingin", "Restoran Selera Nusantara", "Klinik Sehat Sentosa", "Toko Elektronik Maju",
]
TECHNICIANS = ["Budi Santoso", "Agus Wijaya", "Dedi Kurniawan", "Rahmat Hidayat", "Slamet Riyadi"]
SERVICE_TYPES = [
    "AC Cleaning", "AC Repair", "Installation", "Dismantling",
    "Maintenance", "Refrigerant", "Spare Part", "Other",
]


def _line(entry_id, date, code, debit, credit, desc, meta=None):
    a = ACCT[code]
    d = {
        "entry_id": entry_id, "date": date, "account_code": code,
        "account_name": a["name"], "account_type": a["type"],
        "debit": round(debit, 2), "credit": round(credit, 2), "description": desc,
        "is_cash": a.get("cash", False), "cash_kind": a.get("cash_kind"),
        "is_bank": a.get("bank", False),
    }
    if meta:
        d.update(meta)
    return d


def generate_demo_lines(company_id: str, fiscal_year: int = 2025):
    rng = random.Random(42)
    lines = []
    eid = 0

    def new_entry():
        nonlocal eid
        eid += 1
        return f"JE-{eid:05d}"

    # ---------- Opening balances (1 Jan) ----------
    opening_date = f"{fiscal_year}-01-01"
    e = new_entry()
    opening_assets = {
        "1100": 70_000_000, "1000": 8_000_000, "1010": 2_000_000, "1020": 3_000_000,
        "1200": 15_000_000, "1300": 20_000_000, "1500": 60_000_000,
    }
    opening_le = {"2000": 18_000_000, "2300": 30_000_000, "3000": 110_000_000, "3100": 20_000_000}
    for code, amt in opening_assets.items():
        lines.append(_line(e, opening_date, code, amt, 0, "Saldo Awal 2025"))
    for code, amt in opening_le.items():
        lines.append(_line(e, opening_date, code, 0, amt, "Saldo Awal 2025"))

    # ---------- Service jobs (revenue + COGS + transport) ----------
    REV_TARGET = 181_230_000
    MAT_TARGET = 45_000_000
    LAB_TARGET = 25_000_000
    TRA_TARGET = 6_060_000
    n_jobs = 120

    # build raw weights then scale to exact targets
    rev_w = [rng.uniform(0.6, 1.6) for _ in range(n_jobs)]
    rev_sum = sum(rev_w)
    revenues = [round(REV_TARGET * w / rev_sum, -3) for w in rev_w]
    revenues[-1] += REV_TARGET - sum(revenues)  # fix rounding
    materials, labors, transports = [], [], []
    for r in revenues:
        materials.append(r * 0.25 * rng.uniform(0.8, 1.2))
        labors.append(r * 0.14 * rng.uniform(0.8, 1.2))
        transports.append(r * 0.034 * rng.uniform(0.7, 1.3))
    for arr, tgt in [(materials, MAT_TARGET), (labors, LAB_TARGET), (transports, TRA_TARGET)]:
        s = sum(arr)
        for i in range(len(arr)):
            arr[i] = round(arr[i] * tgt / s, -2)
        arr[-1] += tgt - sum(arr)

    job_records = []
    for i in range(n_jobs):
        month = (i % 12) + 1
        day = rng.randint(1, 28)
        date = f"{fiscal_year}-{month:02d}-{day:02d}"
        cust = rng.choice(CUSTOMERS)
        tech = TECHNICIANS[i % len(TECHNICIANS)]
        stype = rng.choice(SERVICE_TYPES)
        job_no = f"JOB-{fiscal_year}-{i+1:04d}"
        rev = revenues[i]
        mat = materials[i]
        lab = labors[i]
        tra = transports[i]
        meta = {"customer": cust, "technician": tech, "service_type": stype, "job_number": job_no}

        # Revenue recognition: 50% bank, 25% office cash, 25% receivable
        e = new_entry()
        lines.append(_line(e, date, "1100", rev * 0.5, 0, f"Pembayaran {job_no}", meta))
        lines.append(_line(e, date, "1000", rev * 0.25, 0, f"Pembayaran tunai {job_no}", meta))
        lines.append(_line(e, date, "1200", rev * 0.25, 0, f"Piutang {job_no}", meta))
        lines.append(_line(e, date, "4000", 0, rev, f"Pendapatan {stype} - {cust}", meta))

        # Material purchase (restock inventory, paid from bank) then consume via COGS
        e = new_entry()
        lines.append(_line(e, date, "1300", mat, 0, f"Pembelian material {job_no}", meta))
        lines.append(_line(e, date, "1100", 0, mat, f"Bayar pembelian material {job_no}", meta))
        e = new_entry()
        lines.append(_line(e, date, "5000", mat, 0, f"Pemakaian material {job_no}", meta))
        lines.append(_line(e, date, "1300", 0, mat, f"Material terpakai {job_no}", meta))
        lines.append(_line(e, date, "5100", lab, 0, f"Tenaga kerja {job_no}", meta))
        lines.append(_line(e, date, "1100", 0, lab, f"Bayar tenaga kerja {job_no}", meta))

        # Transport
        e = new_entry()
        lines.append(_line(e, date, "6100", tra, 0, f"Transport {job_no}", meta))
        lines.append(_line(e, date, "1100", 0, tra, f"Bayar transport {job_no}", meta))

        job_records.append({
            "job_number": job_no, "date": date, "customer": cust, "technician": tech,
            "service_type": stype, "revenue": round(rev, 2), "material": round(mat, 2),
            "labor": round(lab, 2), "transport": round(tra, 2),
            "profit": round(rev - mat - lab - tra, 2), "status": "Selesai",
        })

    # ---------- Fixed monthly operating expenses (total 56M/year) ----------
    monthly_opex = {
        "6000": 2_500_000, "6200": 1_000_000, "6300": 400_000,
        "6400": 300_000, "6500": 200_000, "6600": 266_667,
    }
    opex_names = {"6000": "Gaji staff kantor", "6200": "Sewa kantor", "6300": "Listrik & air",
                  "6400": "Iklan & promosi", "6500": "Administrasi & ATK", "6600": "Penyusutan aset tetap"}
    for month in range(1, 13):
        date = f"{fiscal_year}-{month:02d}-28"
        for code, amt in monthly_opex.items():
            e = new_entry()
            lines.append(_line(e, date, code, amt, 0, f"{opex_names[code]} bln {month}"))
            if code == "6600":
                lines.append(_line(e, date, "1600", 0, amt, f"Penyusutan bln {month}"))
            else:
                lines.append(_line(e, date, "1100", 0, amt, f"{opex_names[code]} bln {month}"))

    return lines, job_records
