import { useEffect, useState } from "react";
import { api, formatIDR, MONTHS_ID } from "../lib/api";
import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { InfoTip } from "../components/Common";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

function Line({ label, value, help }) {
  const neg = value < 0;
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100">
      <span className="flex items-center gap-1.5 text-sm text-slate-600">{label} {help && <InfoTip {...help} />}</span>
      <span className={`tabular text-sm font-semibold ${neg ? "text-era-critical" : "text-slate-800"}`}>{formatIDR(value)}</span>
    </div>
  );
}

export default function CashFlow() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/financial/cash-flow").then(({ data }) => setD(data)).catch(() => {}); }, []);
  if (!d) return <Skeleton className="h-96 rounded-xl" />;
  const chart = d.series.map((s) => ({ month: MONTHS_ID[s.month - 1], Net: s.net }));

  return (
    <div className="space-y-6" data-testid="cf-page">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Cash Flow</h1>
        <p className="text-slate-500 text-sm mt-1">Laporan Arus Kas · FY2025</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border border-era-border rounded-xl">
          <Line label="Beginning Cash (Kas Awal)" value={d.beginning_cash} />
          <Line label="Operating Cash Flow" value={d.operating} help={{ what: "Kas dari aktivitas operasional (penjualan, biaya).", why: "Inti kemampuan bisnis menghasilkan kas." }} />
          <Line label="Investing Cash Flow" value={d.investing} help={{ what: "Kas dari pembelian/penjualan aset tetap.", why: "Menunjukkan investasi jangka panjang." }} />
          <Line label="Financing Cash Flow" value={d.financing} help={{ what: "Kas dari pinjaman & modal pemilik.", why: "Menunjukkan pendanaan bisnis." }} />
          <Line label="Net Cash Flow" value={d.net_cash_flow} />
          <div className="flex items-center justify-between py-3 mt-1 bg-emerald-50 rounded-md px-4">
            <span className="font-display font-bold text-era-primary">Ending Cash (Kas Akhir)</span>
            <span className="font-display font-extrabold text-era-primary tabular">{formatIDR(d.ending_cash)}</span>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-era-border rounded-xl lg:col-span-2">
          <h3 className="font-display font-bold mb-4">Arus Kas Bersih per Bulan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatIDR(v, true)} width={70} />
              <Tooltip formatter={(v) => formatIDR(v)} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0" }} />
              <ReferenceLine y={0} stroke="#CBD5E1" />
              <Bar dataKey="Net" radius={[6, 6, 0, 0]} fill="#2E7D32" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
