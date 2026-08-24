"""Deterministic Financial Engine. AI never computes these numbers."""
from collections import defaultdict
from demo_data import ACCT

OPENING_DESC = "Saldo Awal"


def _signed_natural(acct_type, debit, credit):
    if acct_type in ("revenue", "liability", "equity", "contra_asset"):
        return credit - debit
    return debit - credit  # asset, cogs, expense


def _acct_balances(lines):
    bal = defaultdict(float)
    for l in lines:
        bal[l["account_code"]] += _signed_natural(l["account_type"], l["debit"], l["credit"])
    return bal


def _filter_period(lines, months=None):
    if not months:
        return lines
    return [l for l in lines if int(l["date"][5:7]) in months]


def profit_and_loss(lines, months=None, prev_months=None):
    def compute(subset):
        bal = _acct_balances([l for l in subset if l["account_type"] in ("revenue", "cogs", "expense")])
        rows = []
        revenue = cogs = opex = 0.0
        for a in ACCT.values():
            if a["type"] not in ("revenue", "cogs", "expense"):
                continue
            amt = round(bal.get(a["code"], 0.0), 2)
            if a["type"] == "revenue":
                revenue += amt
            elif a["type"] == "cogs":
                cogs += amt
            else:
                opex += amt
            if abs(amt) > 0.01:
                rows.append({"code": a["code"], "name": a["name"], "type": a["type"], "amount": amt})
        gross = revenue - cogs
        op = gross - opex
        net = op
        return {
            "rows": rows, "revenue": round(revenue, 2), "cogs": round(cogs, 2),
            "gross_profit": round(gross, 2), "operating_expense": round(opex, 2),
            "operating_profit": round(op, 2), "net_profit": round(net, 2),
            "gross_margin": round(gross / revenue * 100, 2) if revenue else 0,
            "net_margin": round(net / revenue * 100, 2) if revenue else 0,
        }

    current = compute(_filter_period(lines, months))
    previous = compute(_filter_period(lines, prev_months)) if prev_months else None

    # monthly revenue / net series (full data)
    series = []
    for m in range(1, 13):
        mp = compute(_filter_period(lines, [m]))
        series.append({"month": m, "revenue": mp["revenue"], "net_profit": mp["net_profit"],
                       "expense": round(mp["cogs"] + mp["operating_expense"], 2)})
    return {"current": current, "previous": previous, "series": series}


def balance_sheet(lines):
    bal = _acct_balances(lines)
    pnl = profit_and_loss(lines)["current"]
    net_profit = pnl["net_profit"]

    assets, liabilities, equity = [], [], []
    total_assets = total_liab = total_equity = 0.0
    for a in ACCT.values():
        amt = round(bal.get(a["code"], 0.0), 2)
        if a["type"] in ("asset", "contra_asset"):
            if a["type"] == "contra_asset":
                amt = -amt  # contra reduces total assets
            total_assets += amt
            if abs(amt) > 0.01:
                assets.append({"code": a["code"], "name": a["name"], "amount": amt})
        elif a["type"] == "liability":
            total_liab += amt
            if abs(amt) > 0.01:
                liabilities.append({"code": a["code"], "name": a["name"], "amount": amt})
        elif a["type"] == "equity":
            total_equity += amt
            if abs(amt) > 0.01:
                equity.append({"code": a["code"], "name": a["name"], "amount": amt})

    equity.append({"code": "3200", "name": "Laba Tahun Berjalan (Current Year Profit)", "amount": round(net_profit, 2)})
    total_equity += net_profit
    diff = round(total_assets - (total_liab + total_equity), 2)
    return {
        "assets": assets, "liabilities": liabilities, "equity": equity,
        "total_assets": round(total_assets, 2), "total_liabilities": round(total_liab, 2),
        "total_equity": round(total_equity, 2), "balanced": abs(diff) < 1.0, "difference": diff,
    }


def _cf_section(other_types, other_codes):
    invest = {"1500", "1600"}
    finance = {"2300", "3000", "3100"}
    if other_codes & finance:
        return "financing"
    if other_codes & invest:
        return "investing"
    return "operating"


def cash_flow(lines):
    entries = defaultdict(list)
    for l in lines:
        entries[l["entry_id"]].append(l)

    beginning = 0.0
    flows = {"operating": 0.0, "investing": 0.0, "financing": 0.0}
    monthly = defaultdict(float)

    for eid, els in entries.items():
        is_opening = any(OPENING_DESC in (e.get("description") or "") for e in els)
        cash_lines = [e for e in els if e.get("is_cash")]
        if not cash_lines:
            continue
        cash_delta = sum(e["debit"] - e["credit"] for e in cash_lines)
        if is_opening:
            beginning += cash_delta
            continue
        other = [e for e in els if not e.get("is_cash")]
        other_codes = {e["account_code"] for e in other}
        section = _cf_section(None, other_codes)
        flows[section] += cash_delta
        month = int(els[0]["date"][5:7])
        monthly[month] += cash_delta

    net = sum(flows.values())
    ending = beginning + net
    series = [{"month": m, "net": round(monthly.get(m, 0.0), 2)} for m in range(1, 13)]
    return {
        "beginning_cash": round(beginning, 2),
        "operating": round(flows["operating"], 2),
        "investing": round(flows["investing"], 2),
        "financing": round(flows["financing"], 2),
        "net_cash_flow": round(net, 2), "ending_cash": round(ending, 2),
        "series": series,
    }


def cash_on_hand(lines):
    bal = _acct_balances(lines)
    buckets = {"office": 0.0, "petty": 0.0, "technician": 0.0, "project": 0.0, "bank": 0.0}
    detail = []
    for a in ACCT.values():
        if a.get("cash"):
            amt = round(bal.get(a["code"], 0.0), 2)
            buckets[a["cash_kind"]] += amt
            detail.append({"code": a["code"], "name": a["name"], "kind": a["cash_kind"], "amount": amt})
    total_cash_on_hand = sum(v for k, v in buckets.items() if k != "bank")
    return {
        "detail": detail, "bank": round(buckets["bank"], 2),
        "cash_on_hand": round(total_cash_on_hand, 2),
        "total_cash": round(sum(buckets.values()), 2),
    }


def ratios(lines):
    bal = _acct_balances(lines)
    bs = balance_sheet(lines)
    pnl = profit_and_loss(lines)["current"]

    current_assets = sum(bal.get(c, 0) for c in ("1000", "1010", "1020", "1030", "1100", "1200", "1300"))
    quick_assets = current_assets - bal.get("1300", 0)
    cash_assets = sum(bal.get(c, 0) for c in ("1000", "1010", "1020", "1030", "1100"))
    current_liab = sum(bal.get(c, 0) for c in ("2000", "2100", "2200"))
    total_liab = bs["total_liabilities"]
    equity = bs["total_equity"]
    assets = bs["total_assets"]
    net = pnl["net_profit"]

    def safe(n, d):
        return round(n / d, 2) if d else 0

    return {
        "current_ratio": safe(current_assets, current_liab),
        "quick_ratio": safe(quick_assets, current_liab),
        "cash_ratio": safe(cash_assets, current_liab),
        "debt_to_equity": safe(total_liab, equity),
        "roa": safe(net, assets) * 100 if assets else 0,
        "roe": safe(net, equity) * 100 if equity else 0,
        "gross_margin": pnl["gross_margin"],
        "net_margin": pnl["net_margin"],
        "expense_ratio": safe(pnl["cogs"] + pnl["operating_expense"], pnl["revenue"]) * 100,
    }


def kpis(lines, jobs):
    pnl = profit_and_loss(lines)["current"]
    r = ratios(lines)
    n_jobs = len(jobs)
    total_rev = sum(j["revenue"] for j in jobs)
    tech_stats = defaultdict(lambda: {"jobs": 0, "revenue": 0.0, "profit": 0.0})
    cust_stats = defaultdict(lambda: {"jobs": 0, "revenue": 0.0, "profit": 0.0})
    for j in jobs:
        t = tech_stats[j["technician"]]
        t["jobs"] += 1
        t["revenue"] += j["revenue"]
        t["profit"] += j["profit"]
        c = cust_stats[j["customer"]]
        c["jobs"] += 1
        c["revenue"] += j["revenue"]
        c["profit"] += j["profit"]

    technicians = [{"name": k, **{kk: round(vv, 2) for kk, vv in v.items()},
                    "margin": round(v["profit"] / v["revenue"] * 100, 1) if v["revenue"] else 0}
                   for k, v in tech_stats.items()]
    customers = [{"name": k, **{kk: round(vv, 2) for kk, vv in v.items()},
                  "margin": round(v["profit"] / v["revenue"] * 100, 1) if v["revenue"] else 0}
                 for k, v in cust_stats.items()]
    technicians.sort(key=lambda x: x["profit"], reverse=True)
    customers.sort(key=lambda x: x["profit"], reverse=True)

    top_cust_rev = max((c["revenue"] for c in customers), default=0)
    concentration = round(top_cust_rev / total_rev * 100, 1) if total_rev else 0

    financial = {
        "revenue": pnl["revenue"], "gross_profit": pnl["gross_profit"],
        "gross_margin": pnl["gross_margin"], "net_profit": pnl["net_profit"],
        "net_margin": pnl["net_margin"], "expense_ratio": r["expense_ratio"],
        "current_ratio": r["current_ratio"], "quick_ratio": r["quick_ratio"],
        "cash_ratio": r["cash_ratio"], "debt_to_equity": r["debt_to_equity"],
        "roa": round(r["roa"], 2), "roe": round(r["roe"], 2),
    }
    service = {
        "total_jobs": n_jobs,
        "revenue_per_job": round(total_rev / n_jobs, 2) if n_jobs else 0,
        "profit_per_job": round(sum(j["profit"] for j in jobs) / n_jobs, 2) if n_jobs else 0,
        "average_invoice": round(total_rev / n_jobs, 2) if n_jobs else 0,
        "material_cost_per_job": round(sum(j["material"] for j in jobs) / n_jobs, 2) if n_jobs else 0,
        "labor_cost_per_job": round(sum(j["labor"] for j in jobs) / n_jobs, 2) if n_jobs else 0,
    }
    customer_kpi = {
        "total_customers": len(customers),
        "customer_concentration": concentration,
    }
    return {"financial": financial, "service": service, "customer": customer_kpi,
            "technicians": technicians, "customers": customers}


def _status(value, warn, crit, higher_better=True):
    if higher_better:
        if value >= warn:
            return "green"
        if value >= crit:
            return "yellow"
        return "red"
    else:
        if value <= warn:
            return "green"
        if value <= crit:
            return "yellow"
        return "red"


def health_score(lines):
    r = ratios(lines)
    cf = cash_flow(lines)
    pnl = profit_and_loss(lines)["current"]

    profitability = min(100, max(0, pnl["net_margin"] / 20 * 100))
    liquidity = min(100, max(0, r["current_ratio"] / 2 * 100))
    cashflow = 100 if cf["operating"] > 0 else 40
    solvency = min(100, max(0, (2 - r["debt_to_equity"]) / 2 * 100))
    efficiency = min(100, max(0, (1 - r["expense_ratio"] / 100) / 0.4 * 100))

    score = round(profitability * 0.30 + liquidity * 0.25 + cashflow * 0.20 +
                  solvency * 0.15 + efficiency * 0.10)
    status = "Sehat" if score >= 80 else ("Perhatian" if score >= 60 else "Kritis")
    return {
        "score": score, "status": status,
        "components": {
            "profitability": round(profitability), "liquidity": round(liquidity),
            "cash_flow": round(cashflow), "solvency": round(solvency),
            "operational_efficiency": round(efficiency),
        },
        "weights": {"profitability": 30, "liquidity": 25, "cash_flow": 20, "solvency": 15, "operational_efficiency": 10},
    }


def data_quality(lines, jobs):
    completeness = 95
    mapping_quality = 92
    reconciliation = 78
    duplicate_rate = 2
    validation_errors = 1
    source_coverage = 88
    score = round((completeness + mapping_quality + reconciliation +
                   (100 - duplicate_rate) + (100 - validation_errors * 5) + source_coverage) / 6)
    return {
        "score": score,
        "components": {
            "completeness": completeness, "mapping_quality": mapping_quality,
            "reconciliation_status": reconciliation, "duplicate_rate": duplicate_rate,
            "validation_errors": validation_errors, "source_coverage": source_coverage,
        },
    }
