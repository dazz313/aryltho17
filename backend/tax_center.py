"""Indonesian Tax Center — deterministic estimates. AI only explains.
Regimes: PPh Final UMKM 0,5% (PP 55/2022) vs Tarif Umum PPh Badan 22% (fasilitas Pasal 31E).
PPN opsional (PKP 12% / non-PKP). PPh 21 (gaji) & PPh 23 (jasa/sewa)."""
import financial_engine as fe

PTKP_TK0 = 54_000_000            # PTKP Tidak Kawin / 0 tanggungan
FACILITY_LIMIT = 4_800_000_000   # batas peredaran bruto fasilitas Pasal 31E
PPH_FINAL_RATE = 0.005
PPN_RATE = 0.12
PPH21_RATE = 0.05
PPH23_RATE = 0.02
BADAN_RATE = 0.22


def compute(lines, pkp: bool = False):
    pnl_all = fe.profit_and_loss(lines)
    pnl = pnl_all["current"]
    bal = fe._acct_balances(lines)
    revenue = pnl["revenue"]
    net = pnl["net_profit"]

    # --- PPh Final UMKM 0,5% ---
    pph_final_annual = round(revenue * PPH_FINAL_RATE, 2)
    monthly_final = [{"month": s["month"], "revenue": s["revenue"],
                      "amount": round(s["revenue"] * PPH_FINAL_RATE, 2)} for s in pnl_all["series"]]

    # --- PPh Badan Tarif Umum (Pasal 31E) ---
    facility = revenue <= FACILITY_LIMIT
    if facility:
        badan = round(net * BADAN_RATE * 0.5, 2)
        eff = round(BADAN_RATE * 0.5 * 100, 2)
    else:
        pf = net * (FACILITY_LIMIT / revenue)
        badan = round(pf * (BADAN_RATE * 0.5) + (net - pf) * BADAN_RATE, 2)
        eff = round(badan / net * 100, 2) if net else 0
    badan_full = round(net * BADAN_RATE, 2)

    cheaper = "final" if pph_final_annual <= badan else "badan"
    saving = round(abs(pph_final_annual - badan), 2)

    # --- PPN ---
    material_base = round(bal.get("5000", 0), 2)  # pembelian material sbg dasar PPN masukan
    if pkp:
        ppn_out = round(revenue * PPN_RATE, 2)
        ppn_in = round(material_base * PPN_RATE, 2)
        ppn_payable = round(ppn_out - ppn_in, 2)
    else:
        ppn_out = ppn_in = ppn_payable = 0.0

    # --- PPh 21 (gaji) ---
    payroll = round(bal.get("6000", 0), 2)
    taxable21 = max(0.0, payroll - PTKP_TK0)
    pph21 = round(taxable21 * PPH21_RATE, 2)

    # --- PPh 23 (sewa/jasa) ---
    rent = round(bal.get("6200", 0), 2)
    pph23_withhold = round(rent * PPH23_RATE, 2)            # yang wajib dipotong atas sewa
    pph23_credit = round(revenue * PPH23_RATE, 2)           # estimasi dipotong pelanggan (kredit pajak)

    chosen_annual = pph_final_annual if cheaper == "final" else badan
    obligations = [
        {"tax": "PPh Final UMKM 0,5%", "amount": round(pph_final_annual / 12, 2),
         "freq": "Bulanan", "due": "Tgl 15 bulan berikutnya", "type": "final"},
    ]
    if pkp:
        obligations.append({"tax": "PPN (SPT Masa PPN)", "amount": round(ppn_payable / 12, 2) if ppn_payable else 0,
                            "freq": "Bulanan", "due": "Akhir bulan berikutnya", "type": "ppn"})
    if pph21 > 0:
        obligations.append({"tax": "PPh 21 Karyawan", "amount": round(pph21 / 12, 2),
                            "freq": "Bulanan", "due": "Tgl 10 bulan berikutnya", "type": "pph21"})
    obligations.append({"tax": "SPT Tahunan Badan", "amount": chosen_annual,
                        "freq": "Tahunan", "due": "4 bulan setelah tutup buku", "type": "annual"})

    return {
        "revenue": revenue, "net_profit_before_tax": net,
        "pph_final": {"rate_pct": 0.5, "base": revenue, "annual": pph_final_annual,
                      "monthly_avg": round(pph_final_annual / 12, 2), "monthly": monthly_final},
        "pph_badan": {"rate_pct": 22, "facility_31e": facility, "effective_rate_pct": eff,
                      "taxable_income": net, "tax": badan, "tax_without_facility": badan_full},
        "comparison": {"final": pph_final_annual, "badan": badan, "cheaper": cheaper, "saving": saving},
        "ppn": {"pkp": pkp, "rate_pct": 12, "output": ppn_out, "input": ppn_in,
                "payable": ppn_payable, "input_base": material_base},
        "pph21": {"rate_pct": 5, "payroll_base": payroll, "ptkp": PTKP_TK0,
                  "taxable": taxable21, "estimate": pph21},
        "pph23": {"rate_pct": 2, "rent_base": rent, "withhold_on_rent": pph23_withhold,
                  "credit_from_customers": pph23_credit},
        "monthly_obligations": obligations,
        "notes": [
            "Angka pajak adalah ESTIMASI berdasarkan data yang tercatat, bukan perhitungan pajak final.",
            "PPh Final UMKM 0,5% dihitung dari peredaran bruto (omzet), bukan dari laba.",
            "Fasilitas Pasal 31E memberi tarif efektif 11% untuk peredaran bruto sampai Rp4,8 miliar.",
            f"PPh 21 Rp{pph21:,.0f} — gaji {'di bawah' if pph21 == 0 else 'di atas'} PTKP Rp{PTKP_TK0:,.0f}.",
            "Konsultasikan dengan konsultan pajak / KPP untuk kepatuhan final.",
        ],
    }
