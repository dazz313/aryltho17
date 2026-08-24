"""Analytics: bank reconciliation, anomaly detection, period comparison.
All numbers computed deterministically here; AI only explains the output."""
import random
import statistics as st
from collections import defaultdict
import financial_engine as fe

# ---------------- Period comparison ----------------
PERIODS = {
    "FY": list(range(1, 13)),
    "Q1": [1, 2, 3], "Q2": [4, 5, 6], "Q3": [7, 8, 9], "Q4": [10, 11, 12],
    **{f"M{i}": [i] for i in range(1, 13)},
}
PREV = {"Q2": "Q1", "Q3": "Q2", "Q4": "Q3", **{f"M{i}": f"M{i-1}" for i in range(2, 13)}}
PERIOD_LABEL = {
    "FY": "Tahun Penuh", "Q1": "Kuartal 1", "Q2": "Kuartal 2", "Q3": "Kuartal 3", "Q4": "Kuartal 4",
    **{f"M{i}": ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][i - 1] for i in range(1, 13)},
}
_METRICS = ["revenue", "cogs", "gross_profit", "operating_expense", "net_profit", "net_margin"]


def build_prior_year(lines):
    """Synthesize a prior-year (comparison) monthly P&L ~15% smaller, for YoY."""
    rng = random.Random(7)
    series = []
    for m in range(1, 13):
        cur = fe.profit_and_loss(lines, months=[m])["current"]
        f = 0.84 + rng.uniform(-0.05, 0.05)
        rev = round(cur["revenue"] * f, -3)
        cogs = round(cur["cogs"] * f, -3)
        opex = round(cur["operating_expense"] * (0.92 + rng.uniform(-0.03, 0.03)), -3)
        net = round(rev - cogs - opex, 2)
        series.append({
            "month": m, "revenue": rev, "cogs": cogs, "operating_expense": opex,
            "gross_profit": round(rev - cogs, 2), "net_profit": net,
            "net_margin": round(net / rev * 100, 2) if rev else 0,
        })
    return series


def _delta(cur, prev):
    if prev is None:
        return None
    diff = cur - prev
    pct = (diff / prev * 100) if prev else None
    return {"value": round(prev, 2), "diff": round(diff, 2),
            "pct": round(pct, 2) if pct is not None else None,
            "direction": "up" if diff > 0 else ("down" if diff < 0 else "flat")}


def period_pnl(lines, prior_year_series, period="FY"):
    period = period if period in PERIODS else "FY"
    months = PERIODS[period]
    cur = fe.profit_and_loss(lines, months=months)["current"]

    prev_key = PREV.get(period)
    previous = fe.profit_and_loss(lines, months=PERIODS[prev_key])["current"] if prev_key else None

    yoy = None
    if prior_year_series:
        agg = {k: 0.0 for k in ("revenue", "cogs", "gross_profit", "operating_expense", "net_profit")}
        for m in months:
            row = next((x for x in prior_year_series if x["month"] == m), None)
            if row:
                for k in agg:
                    agg[k] += row.get(k, 0)
        agg["net_margin"] = round(agg["net_profit"] / agg["revenue"] * 100, 2) if agg["revenue"] else 0
        yoy = agg

    comparison = []
    for k in _METRICS:
        comparison.append({
            "key": k, "current": cur[k],
            "prev_period": _delta(cur[k], previous[k]) if previous else None,
            "yoy": _delta(cur[k], yoy[k]) if yoy else None,
        })
    return {
        "period": period, "period_label": PERIOD_LABEL[period],
        "prev_key": prev_key, "prev_label": PERIOD_LABEL.get(prev_key) if prev_key else None,
        "current": cur, "previous": previous, "yoy": yoy, "comparison": comparison,
    }


# ---------------- Anomaly detection ----------------
def _rp(v):
    return f"Rp{v:,.0f}"


def detect_anomalies(lines, jobs):
    anomalies = []
    monthly = defaultdict(lambda: defaultdict(float))
    names = {}
    for l in lines:
        if l["account_type"] in ("cogs", "expense"):
            m = int(l["date"][5:7])
            monthly[l["account_code"]][m] += l["debit"] - l["credit"]
            names[l["account_code"]] = l["account_name"]

    for code, mm in monthly.items():
        vals = [mm.get(m, 0) for m in range(1, 13)]
        nz = [v for v in vals if v > 0]
        if len(nz) < 4:
            continue
        mean = st.mean(nz)
        sd = st.pstdev(nz)
        if sd <= 0:
            continue
        for m in range(1, 13):
            v = mm.get(m, 0)
            if v > mean + 1.8 * sd and v > mean * 1.25:
                anomalies.append({
                    "id": f"exp-{code}-{m}", "type": "expense_spike",
                    "severity": "red" if v > mean + 2.6 * sd else "yellow",
                    "title": f"Lonjakan biaya: {names[code]} (bln {m})",
                    "description": f"{names[code]} bulan ke-{m} sebesar {_rp(v)}, jauh di atas rata-rata bulanan {_rp(mean)}.",
                    "evidence": {"account": names[code], "month": m, "value": round(v, 2),
                                 "monthly_average": round(mean, 2),
                                 "deviation_pct": round((v - mean) / mean * 100, 1)},
                })

    rev = [0.0] * 13
    for l in lines:
        if l["account_type"] == "revenue":
            rev[int(l["date"][5:7])] += l["credit"] - l["debit"]
    for m in range(2, 13):
        if rev[m - 1] > 0:
            change = (rev[m] - rev[m - 1]) / rev[m - 1] * 100
            if change < -18:
                anomalies.append({
                    "id": f"rev-drop-{m}", "type": "revenue_drop",
                    "severity": "red" if change < -30 else "yellow",
                    "title": f"Penurunan revenue tajam (bln {m})",
                    "description": f"Revenue bulan ke-{m} turun {abs(round(change,1))}% dibanding bulan sebelumnya ({_rp(rev[m-1])} → {_rp(rev[m])}).",
                    "evidence": {"month": m, "prev_revenue": round(rev[m - 1], 2),
                                 "revenue": round(rev[m], 2), "change_pct": round(change, 1)},
                })

    margins = [(j, (j["profit"] / j["revenue"] * 100) if j["revenue"] else 0) for j in jobs]
    ms = [x[1] for x in margins]
    if len(ms) >= 5:
        mean = st.mean(ms)
        sd = st.pstdev(ms)
        thresh = mean - 1.5 * sd
        low = sorted([x for x in margins if x[1] < thresh], key=lambda x: x[1])[:8]
        for j, mg in low:
            anomalies.append({
                "id": f"job-{j['job_number']}", "type": "low_margin_job",
                "severity": "red" if mg < mean - 2.2 * sd else "yellow",
                "title": f"Margin tidak wajar: {j['job_number']}",
                "description": f"{j['job_number']} ({j['customer']}) margin {round(mg,1)}%, jauh di bawah rata-rata {round(mean,1)}%. Revenue {_rp(j['revenue'])}, profit {_rp(j['profit'])}.",
                "evidence": {"job_number": j["job_number"], "customer": j["customer"],
                             "technician": j["technician"], "revenue": j["revenue"],
                             "material": j["material"], "labor": j["labor"], "profit": j["profit"],
                             "margin_pct": round(mg, 1), "average_margin_pct": round(mean, 1)},
            })

    order = {"red": 0, "yellow": 1}
    anomalies.sort(key=lambda a: order.get(a["severity"], 2))
    summary = {
        "total": len(anomalies),
        "red": sum(1 for a in anomalies if a["severity"] == "red"),
        "yellow": sum(1 for a in anomalies if a["severity"] == "yellow"),
        "by_type": {t: sum(1 for a in anomalies if a["type"] == t)
                    for t in {a["type"] for a in anomalies}},
    }
    return {"anomalies": anomalies, "summary": summary}


# ---------------- Bank reconciliation ----------------
def bank_movements(lines, month=None):
    out = []
    for l in lines:
        if l["account_code"] == "1100":
            m = int(l["date"][5:7])
            if month and m != month:
                continue
            amt = round(l["debit"] - l["credit"], 2)
            if abs(amt) < 0.01:
                continue
            out.append({"date": l["date"], "description": l["description"], "amount": amt})
    out.sort(key=lambda x: x["date"])
    return out


def reconcile(book, statement, amt_tol=1.0, date_tol_days=5):
    from datetime import date

    def d(s):
        return date.fromisoformat(s[:10])

    used = [False] * len(book)
    matched, unmatched_stmt = [], []
    for s in statement:
        found = -1
        for i, b in enumerate(book):
            if used[i]:
                continue
            if abs(b["amount"] - s["amount"]) <= amt_tol and abs((d(s["date"]) - d(b["date"])).days) <= date_tol_days:
                found = i
                break
        if found >= 0:
            used[found] = True
            matched.append({"book": book[found], "statement": s})
        else:
            unmatched_stmt.append(s)
    unmatched_book = [book[i] for i in range(len(book)) if not used[i]]

    book_balance = round(sum(b["amount"] for b in book), 2)
    stmt_balance = round(sum(s["amount"] for s in statement), 2)
    difference = round(stmt_balance - book_balance, 2)
    return {
        "matched_count": len(matched), "matched": matched[:100],
        "unmatched_book": unmatched_book, "unmatched_statement": unmatched_stmt,
        "book_balance": book_balance, "statement_balance": stmt_balance,
        "difference": difference, "reconciled": abs(difference) < 1.0,
        "book_count": len(book), "statement_count": len(statement),
    }


def demo_statement(book):
    """Simulate a bank statement from the book with realistic discrepancies."""
    stmt = [dict(b) for b in book]
    dropped = None
    if len(stmt) > 3:
        idx = next((i for i, s in enumerate(stmt) if s["amount"] > 0), len(stmt) // 2)
        dropped = stmt.pop(idx)
    last_date = book[-1]["date"] if book else "2025-06-28"
    stmt.append({"date": last_date, "description": "Biaya Administrasi Bank", "amount": -150000})
    stmt.append({"date": last_date, "description": "Bunga Jasa Giro", "amount": 25000})
    stmt.sort(key=lambda x: x["date"])
    return stmt, dropped


def compact_recon(result):
    """Compact context for the AI (drop the large matched list)."""
    return {
        "book_balance": result["book_balance"], "statement_balance": result["statement_balance"],
        "difference": result["difference"], "reconciled": result["reconciled"],
        "matched_count": result["matched_count"],
        "unmatched_book": result["unmatched_book"][:20],
        "unmatched_statement": result["unmatched_statement"][:20],
    }
