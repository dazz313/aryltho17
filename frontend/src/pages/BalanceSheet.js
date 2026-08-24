import { useEffect, useState } from "react";
import { api, formatIDR } from "../lib/api";
import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/Common";
import { CheckCircle, XCircle } from "@phosphor-icons/react";

function Section({ title, rows, total, totalLabel, accent }) {
  return (
    <Card className="p-6 bg-white border border-era-border rounded-xl">
      <h3 className="font-display font-bold mb-3">{title}</h3>
      <div className="space-y-0">
        {rows.map((r) => (
          <div key={r.code} className="flex items-center justify-between py-2 border-b border-slate-100 text-sm text-slate-600">
            <span>{r.name}</span>
            <span className="tabular">{formatIDR(r.amount)}</span>
          </div>
        ))}
      </div>
      <div className={`flex items-center justify-between pt-3 mt-1 font-display font-bold ${accent}`}>
        <span>{totalLabel}</span>
        <span className="tabular">{formatIDR(total)}</span>
      </div>
    </Card>
  );
}

export default function BalanceSheet() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/financial/balance-sheet").then(({ data }) => setD(data)).catch(() => {}); }, []);
  if (!d) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-6" data-testid="bs-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Balance Sheet</h1>
          <p className="text-slate-500 text-sm mt-1">Neraca · per 31 Des 2025</p>
        </div>
        {d.balanced ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5" data-testid="bs-balanced">
            <CheckCircle size={18} weight="fill" /> Seimbang (Assets = Liabilities + Equity)
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1.5" data-testid="bs-unbalanced">
            <XCircle size={18} weight="fill" /> Tidak seimbang: selisih {formatIDR(d.difference)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Assets (Aset)" rows={d.assets} total={d.total_assets} totalLabel="Total Assets" accent="text-era-primary" />
        <div className="space-y-6">
          <Section title="Liabilities (Kewajiban)" rows={d.liabilities} total={d.total_liabilities} totalLabel="Total Liabilities" accent="text-era-secondary" />
          <Section title="Equity (Ekuitas)" rows={d.equity} total={d.total_equity} totalLabel="Total Equity" accent="text-era-secondary" />
        </div>
      </div>

      <Card className="p-6 bg-slate-50 border border-era-border rounded-xl flex items-center justify-around flex-wrap gap-4">
        <div className="text-center">
          <p className="text-xs text-slate-500">Total Assets</p>
          <p className="font-display text-xl font-extrabold text-era-primary tabular">{formatIDR(d.total_assets)}</p>
        </div>
        <span className="text-2xl font-bold text-slate-300">=</span>
        <div className="text-center">
          <p className="text-xs text-slate-500">Liabilities + Equity</p>
          <p className="font-display text-xl font-extrabold text-era-secondary tabular">{formatIDR(d.total_liabilities + d.total_equity)}</p>
        </div>
      </Card>
    </div>
  );
}
