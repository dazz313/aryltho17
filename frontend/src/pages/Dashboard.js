import { useEffect, useState } from "react";
import { api, formatValue, formatIDR, MONTHS_ID } from "../lib/api";
import { StatusBadge, InfoTip } from "../components/Common";
import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendUp, Warning, Lightbulb } from "@phosphor-icons/react";

const KPI_HELP = {
  net_margin: { what: "Persentase laba bersih terhadap total omzet.", why: "Menunjukkan seberapa efisien bisnis mengubah penjualan menjadi keuntungan." },
  receivables: { what: "Uang yang masih harus ditagih dari pelanggan.", why: "Piutang tinggi bisa menghambat arus kas walau laba terlihat besar." },
  cash: { what: "Total uang tunai di bank dan kas fisik.", why: "Kas adalah bahan bakar operasional harian, berbeda dari laba." },
};

function Gauge({ score, label, size = 132, colorKey }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;
  const color = colorKey || (pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444");
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-extrabold tabular" style={{ color }}>{score}</span>
          <span className="text-[11px] text-slate-400">/ 100</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-600">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!data) return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  );

  const revChart = data.revenue_series.map((s) => ({ month: MONTHS_ID[s.month - 1], Revenue: s.revenue, Laba: s.net_profit }));
  const cfChart = data.cash_flow_series.map((s) => ({ month: MONTHS_ID[s.month - 1], Net: s.net }));

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Ringkasan kesehatan finansial · CV Eracool Teknik Solution · FY2025</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.kpi_cards.map((kpi, i) => (
          <Card key={kpi.key} data-testid={`kpi-${kpi.key}`}
            className="p-5 bg-white border border-era-border rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-transform duration-200 animate-fade-up"
            style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-slate-500 leading-tight">{kpi.label}</p>
              {KPI_HELP[kpi.key] && <InfoTip {...KPI_HELP[kpi.key]} testId={`info-${kpi.key}`} />}
            </div>
            <p className="font-display text-2xl font-extrabold tracking-tight mt-2 tabular text-era-text">
              {formatValue(kpi.value, kpi.format)}
            </p>
          </Card>
        ))}
      </div>

      {/* Scores + charts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border border-era-border rounded-xl flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-display font-bold">Financial Health</h3>
            <InfoTip what="Skor kesehatan finansial gabungan (profitabilitas, likuiditas, arus kas, solvabilitas, efisiensi)." why="Memberi gambaran cepat kondisi bisnis dalam satu angka." />
          </div>
          <Gauge score={data.health_score.score} label={data.health_score.status} />
        </Card>

        <Card className="p-6 bg-white border border-era-border rounded-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold">Revenue & Laba Bersih (bulanan)</h3>
            <StatusBadge level="green">2025</StatusBadge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revChart}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatIDR(v, true)} width={70} />
              <Tooltip formatter={(v) => formatIDR(v)} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0" }} />
              <Area type="monotone" dataKey="Revenue" stroke="#2E7D32" strokeWidth={2.5} fill="url(#gRev)" />
              <Area type="monotone" dataKey="Laba" stroke="#5C8EAD" strokeWidth={2} fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 bg-white border border-era-border rounded-xl flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-display font-bold">Data Quality</h3>
            <InfoTip what="Kualitas data yang diimpor: kelengkapan, mapping, rekonsiliasi, duplikasi." why="AI mempertimbangkan skor ini saat menentukan tingkat keyakinan analisis." />
          </div>
          <Gauge score={data.data_quality.score} label="Kualitas Data" colorKey="#5C8EAD" />
        </Card>
      </div>

      {/* Cash flow chart + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border border-era-border rounded-xl lg:col-span-2">
          <h3 className="font-display font-bold mb-4">Arus Kas Bersih Bulanan (Net Cash Flow)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cfChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatIDR(v, true)} width={70} />
              <Tooltip formatter={(v) => formatIDR(v)} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0" }} />
              <Bar dataKey="Net" fill="#5C8EAD" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 bg-white border border-era-border rounded-xl">
          <h3 className="font-display font-bold mb-4">Alerts</h3>
          <div className="space-y-2.5" data-testid="alerts-list">
            {data.alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${a.level === "green" ? "bg-era-success" : a.level === "yellow" ? "bg-era-warning" : "bg-era-critical"}`} />
                <span className="text-slate-600">{a.text}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Problems & opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border border-era-border rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Warning size={20} weight="fill" className="text-era-warning" />
            <h3 className="font-display font-bold">Top 3 Masalah</h3>
          </div>
          <ul className="space-y-3">
            {data.top_problems.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{i + 1}</span>
                {p}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6 bg-white border border-era-border rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={20} weight="fill" className="text-era-primary" />
            <h3 className="font-display font-bold">Top 3 Peluang</h3>
          </div>
          <ul className="space-y-3">
            {data.top_opportunities.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">{i + 1}</span>
                {p}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
