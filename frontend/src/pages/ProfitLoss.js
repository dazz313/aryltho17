import { useEffect, useState } from "react";
import { api, formatIDR } from "../lib/api";
import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { InfoTip } from "../components/Common";
import { Button } from "../components/ui/button";
import { Download } from "@phosphor-icons/react";

const TYPE_LABEL = { revenue: "Revenue", cogs: "COGS", expense: "Operating Expense" };

function Row({ label, value, bold, indent, help }) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-slate-100 ${bold ? "font-bold text-era-text" : "text-slate-600"}`}>
      <span className={`flex items-center gap-1.5 text-sm ${indent ? "pl-4" : ""}`}>{label} {help && <InfoTip {...help} />}</span>
      <span className={`tabular text-sm ${bold ? "font-display" : ""}`}>{formatIDR(value)}</span>
    </div>
  );
}

export default function ProfitLoss() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/financial/pnl").then(({ data }) => setD(data)).catch(() => {}); }, []);
  if (!d) return <Skeleton className="h-96 rounded-xl" />;
  const c = d.current;
  const rev = c.rows.filter((r) => r.type === "revenue");
  const cogs = c.rows.filter((r) => r.type === "cogs");
  const exp = c.rows.filter((r) => r.type === "expense");

  const dl = async () => {
    const res = await api.get("/reports/financial.pdf", { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a"); a.href = url; a.download = "laporan_keuangan.pdf"; a.click();
  };

  return (
    <div className="space-y-6" data-testid="pnl-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Profit & Loss</h1>
          <p className="text-slate-500 text-sm mt-1">Laporan Laba Rugi · FY2025</p>
        </div>
        <Button onClick={dl} data-testid="pnl-export" variant="outline" className="rounded-md border-era-border">
          <Download size={16} weight="bold" className="mr-1.5" /> Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border border-era-border rounded-xl lg:col-span-2">
          <div className="text-xs font-bold uppercase tracking-wide text-era-primary mb-1">{TYPE_LABEL.revenue}</div>
          {rev.map((r) => <Row key={r.code} label={r.name} value={r.amount} indent />)}
          <Row label="Total Revenue" value={c.revenue} bold />
          <div className="h-3" />
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">{TYPE_LABEL.cogs}</div>
          {cogs.map((r) => <Row key={r.code} label={r.name} value={r.amount} indent />)}
          <Row label="Total COGS" value={c.cogs} bold />
          <Row label="Gross Profit" value={c.gross_profit} bold help={{ what: "Revenue dikurangi biaya pokok (material & tenaga kerja langsung).", why: "Menunjukkan profit sebelum biaya operasional." }} />
          <div className="h-3" />
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">{TYPE_LABEL.expense}</div>
          {exp.map((r) => <Row key={r.code} label={r.name} value={r.amount} indent />)}
          <Row label="Total Operating Expense" value={c.operating_expense} bold />
          <div className="flex items-center justify-between py-3 mt-2 bg-emerald-50 rounded-md px-4">
            <span className="font-display font-bold text-era-primary">Net Profit (Laba Bersih)</span>
            <span className="font-display font-extrabold text-era-primary tabular text-lg">{formatIDR(c.net_profit)}</span>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-6 bg-white border border-era-border rounded-xl">
            <p className="text-sm text-slate-500">Gross Margin</p>
            <p className="font-display text-3xl font-extrabold text-era-primary tabular">{c.gross_margin}%</p>
          </Card>
          <Card className="p-6 bg-white border border-era-border rounded-xl">
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-slate-500">Net Margin</p>
              <InfoTip what="Persentase laba bersih terhadap revenue." why="Semakin tinggi, semakin efisien bisnis Anda." />
            </div>
            <p className="font-display text-3xl font-extrabold text-era-secondary tabular">{c.net_margin}%</p>
          </Card>
          <Card className="p-6 bg-white border border-era-border rounded-xl">
            <p className="text-sm text-slate-500">Operating Profit</p>
            <p className="font-display text-2xl font-extrabold tabular">{formatIDR(c.operating_profit)}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
