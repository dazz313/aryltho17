import { useEffect, useState } from "react";
import { api, formatIDR } from "../lib/api";
import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { InfoTip } from "../components/Common";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Download, ArrowUp, ArrowDown, Minus } from "@phosphor-icons/react";

const TYPE_LABEL = { revenue: "Revenue", cogs: "COGS", expense: "Operating Expense" };
const PERIOD_OPTIONS = [
  { v: "FY", l: "Tahun Penuh 2025" },
  { v: "Q1", l: "Kuartal 1" }, { v: "Q2", l: "Kuartal 2" }, { v: "Q3", l: "Kuartal 3" }, { v: "Q4", l: "Kuartal 4" },
  ...["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].map((m, i) => ({ v: `M${i + 1}`, l: m })),
];
const METRIC_LABEL = {
  revenue: "Revenue", cogs: "COGS", gross_profit: "Gross Profit",
  operating_expense: "Operating Expense", net_profit: "Net Profit", net_margin: "Net Margin",
};

function DeltaBadge({ d, invert }) {
  if (!d || d.pct == null) return <span className="text-slate-300 text-xs">—</span>;
  const good = invert ? d.diff < 0 : d.diff > 0;
  const flat = d.diff === 0;
  const Icon = flat ? Minus : d.diff > 0 ? ArrowUp : ArrowDown;
  const color = flat ? "text-slate-400" : good ? "text-emerald-600" : "text-red-500";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
      <Icon size={12} weight="bold" /> {Math.abs(d.pct)}%
    </span>
  );
}

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
  const [period, setPeriod] = useState("FY");
  const [cmp, setCmp] = useState(null);
  useEffect(() => { api.get("/financial/pnl").then(({ data }) => setD(data)).catch(() => {}); }, []);
  useEffect(() => {
    setCmp(null);
    api.get(`/financial/pnl-compare?period=${period}`).then(({ data }) => setCmp(data)).catch(() => {});
  }, [period]);
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

      {/* Period comparison: MoM/QoQ + YoY */}
      <Card className="p-6 bg-white border border-era-border rounded-xl" data-testid="pnl-compare-card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold">Perbandingan Periode</h3>
            <InfoTip what="Membandingkan kinerja periode terpilih dengan periode sebelumnya (MoM/QoQ) dan tahun lalu (YoY)." why="Membantu melihat tren pertumbuhan, bukan hanya angka satu waktu." />
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger data-testid="period-select" className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {PERIOD_OPTIONS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {!cmp ? <Skeleton className="h-40 rounded-lg" /> : (
          <div className="overflow-x-auto era-scroll">
            <table className="w-full text-sm" data-testid="compare-table">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="py-2 font-semibold">Metrik</th>
                  <th className="py-2 text-right font-semibold">{cmp.period_label}</th>
                  <th className="py-2 text-right font-semibold">vs {cmp.prev_label || "Periode Lalu"} (MoM/QoQ)</th>
                  <th className="py-2 text-right font-semibold">vs Tahun Lalu (YoY)</th>
                </tr>
              </thead>
              <tbody>
                {cmp.comparison.map((c) => {
                  const isPct = c.key === "net_margin";
                  const invert = c.key === "cogs" || c.key === "operating_expense";
                  return (
                    <tr key={c.key} className="border-b border-slate-50" data-testid={`compare-${c.key}`}>
                      <td className="py-2.5 text-slate-600">{METRIC_LABEL[c.key]}</td>
                      <td className="py-2.5 text-right font-display font-bold tabular">{isPct ? `${c.current}%` : formatIDR(c.current)}</td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-slate-400 tabular text-xs">{c.prev_period ? (isPct ? `${c.prev_period.value}%` : formatIDR(c.prev_period.value)) : "—"}</span>
                          <DeltaBadge d={c.prev_period} invert={invert} />
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-slate-400 tabular text-xs">{c.yoy ? (isPct ? `${c.yoy.value}%` : formatIDR(c.yoy.value)) : "—"}</span>
                          <DeltaBadge d={c.yoy} invert={invert} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
