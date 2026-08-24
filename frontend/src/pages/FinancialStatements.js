import { useEffect, useState } from "react";
import { api, formatIDR, MONTHS_ID } from "../lib/api";
import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { CheckCircle, FileText } from "@phosphor-icons/react";

function Line({ label, value, bold, indent, accent, section }) {
  if (section) return <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mt-4 mb-1">{label}</p>;
  return (
    <div className={`flex items-center justify-between py-2 border-b border-slate-100 ${bold ? "font-bold" : "text-slate-600"} ${accent || ""}`}>
      <span className={`text-sm ${indent ? "pl-4" : ""}`}>{label}</span>
      <span className={`tabular text-sm ${bold ? "font-display" : ""}`}>{formatIDR(value)}</span>
    </div>
  );
}

export default function FinancialStatements() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/statements/complete").then(({ data }) => setD(data)).catch(() => {}); }, []);
  if (!d) return <Skeleton className="h-96 rounded-xl" />;
  const is = d.income_statement, bs = d.balance_sheet, eq = d.changes_in_equity, cf = d.cash_flow;

  return (
    <div className="space-y-6" data-testid="statements-page">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText size={28} weight="fill" className="text-era-primary" /> Laporan Keuangan Lengkap
        </h1>
        <p className="text-slate-500 text-sm mt-1">Sesuai {d.meta.standard} · {d.meta.name} · FY{d.meta.fiscal_year} · {d.meta.currency}</p>
      </div>

      <Tabs defaultValue="is">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="is" data-testid="tab-is">Laba Rugi</TabsTrigger>
          <TabsTrigger value="bs" data-testid="tab-bs">Neraca</TabsTrigger>
          <TabsTrigger value="eq" data-testid="tab-eq">Perubahan Ekuitas</TabsTrigger>
          <TabsTrigger value="cf" data-testid="tab-cf">Arus Kas</TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes">CALK</TabsTrigger>
        </TabsList>

        {/* Multi-step Income Statement */}
        <TabsContent value="is">
          <Card className="p-6 bg-white border border-era-border rounded-xl max-w-3xl">
            <h3 className="font-display font-bold mb-2">Laporan Laba Rugi (Multi-Step)</h3>
            <Line label="Pendapatan (Revenue)" section />
            {is.revenue_rows.map((r) => <Line key={r.code} label={r.name} value={r.amount} indent />)}
            <Line label="Total Pendapatan" value={is.revenue} bold />
            <Line label="Beban Pokok Penjualan (COGS)" section />
            {is.cogs_rows.map((r) => <Line key={r.code} label={r.name} value={r.amount} indent />)}
            <Line label="Total COGS" value={is.cogs} bold />
            <Line label="Laba Kotor (Gross Profit)" value={is.gross_profit} bold accent="text-era-primary" />
            <Line label="Beban Operasional (Operating Expenses)" section />
            {is.opex_rows.map((r) => <Line key={r.code} label={r.name} value={r.amount} indent />)}
            <Line label="Total Beban Operasional" value={is.operating_expense} bold />
            <Line label="Laba Operasional (Operating Profit)" value={is.operating_profit} bold accent="text-era-secondary" />
            <div className="flex items-center justify-between py-3 mt-2 bg-emerald-50 rounded-md px-4">
              <span className="font-display font-bold text-era-primary">Laba Bersih Sebelum Pajak</span>
              <span className="font-display font-extrabold text-era-primary tabular text-lg">{formatIDR(is.profit_before_tax)}</span>
            </div>
            <div className="mt-4 border border-dashed border-amber-200 bg-amber-50/50 rounded-lg p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1">Estimasi Pajak (informasi)</p>
              <Line label="Estimasi Beban Pajak (PPh Final 0,5%)" value={is.estimated_tax_final} />
              <Line label="Laba Bersih Setelah Pajak (estimasi)" value={is.profit_after_tax} bold accent="text-amber-800" />
              <p className="text-[11px] text-amber-700 mt-1">Pajak belum dibukukan sebagai kewajiban; angka bersifat estimasi (lihat Tax Center).</p>
            </div>
          </Card>
        </TabsContent>

        {/* Classified Balance Sheet */}
        <TabsContent value="bs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-white border border-era-border rounded-xl">
              <h3 className="font-display font-bold mb-2">Aset (Assets)</h3>
              <Line label="Aset Lancar (Current Assets)" section />
              {bs.current_assets.map((a) => <Line key={a.code} label={a.name} value={a.amount} indent />)}
              <Line label="Total Aset Lancar" value={bs.current_assets_total} bold />
              <Line label="Aset Tidak Lancar (Non-Current Assets)" section />
              {bs.noncurrent_assets.map((a) => <Line key={a.code} label={a.name} value={a.amount} indent />)}
              <Line label="Total Aset Tidak Lancar" value={bs.noncurrent_assets_total} bold />
              <Line label="TOTAL ASET" value={bs.total_assets} bold accent="text-era-primary" />
            </Card>
            <div className="space-y-6">
              <Card className="p-6 bg-white border border-era-border rounded-xl">
                <h3 className="font-display font-bold mb-2">Liabilitas (Liabilities)</h3>
                <Line label="Liabilitas Jangka Pendek" section />
                {bs.current_liabilities.map((a) => <Line key={a.code} label={a.name} value={a.amount} indent />)}
                <Line label="Total Jangka Pendek" value={bs.current_liabilities_total} bold />
                <Line label="Liabilitas Jangka Panjang" section />
                {bs.noncurrent_liabilities.map((a) => <Line key={a.code} label={a.name} value={a.amount} indent />)}
                <Line label="Total Jangka Panjang" value={bs.noncurrent_liabilities_total} bold />
                <Line label="TOTAL LIABILITAS" value={bs.total_liabilities} bold accent="text-era-secondary" />
              </Card>
              <Card className="p-6 bg-white border border-era-border rounded-xl">
                <h3 className="font-display font-bold mb-2">Ekuitas (Equity)</h3>
                {bs.equity.map((a) => <Line key={a.code} label={a.name} value={a.amount} indent />)}
                <Line label="TOTAL EKUITAS" value={bs.total_equity} bold accent="text-era-secondary" />
              </Card>
            </div>
          </div>
          <Card className={`p-4 mt-6 rounded-xl border flex items-center justify-center gap-2 ${bs.balanced ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`} data-testid="statements-balanced">
            <CheckCircle size={18} weight="fill" className={bs.balanced ? "text-era-success" : "text-era-critical"} />
            <span className="text-sm font-semibold">{bs.balanced ? "Neraca Seimbang" : "Neraca Tidak Seimbang"}: Total Aset {formatIDR(bs.total_assets)} = Liabilitas + Ekuitas {formatIDR(bs.total_liabilities_equity)}</span>
          </Card>
        </TabsContent>

        {/* Changes in Equity */}
        <TabsContent value="eq">
          <Card className="p-6 bg-white border border-era-border rounded-xl max-w-2xl">
            <h3 className="font-display font-bold mb-3">Laporan Perubahan Ekuitas</h3>
            <Line label="Modal Pemilik (awal)" value={eq.modal} />
            <Line label="Laba Ditahan (awal)" value={eq.retained_opening} />
            <Line label="Ekuitas Awal Periode" value={eq.beginning_equity} bold />
            <Line label="(+) Laba Bersih Tahun Berjalan" value={eq.net_profit} indent accent="text-era-primary" />
            <Line label="(−) Prive / Penarikan Pemilik" value={eq.prive} indent />
            <div className="flex items-center justify-between py-3 mt-2 bg-emerald-50 rounded-md px-4">
              <span className="font-display font-bold text-era-primary">Ekuitas Akhir Periode</span>
              <span className="font-display font-extrabold text-era-primary tabular text-lg">{formatIDR(eq.ending_equity)}</span>
            </div>
          </Card>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cf">
          <Card className="p-6 bg-white border border-era-border rounded-xl max-w-2xl">
            <h3 className="font-display font-bold mb-3">Laporan Arus Kas</h3>
            <Line label="Kas Awal" value={cf.beginning_cash} />
            <Line label="Arus Kas Operasi" value={cf.operating} indent />
            <Line label="Arus Kas Investasi" value={cf.investing} indent />
            <Line label="Arus Kas Pendanaan" value={cf.financing} indent />
            <Line label="Kenaikan/(Penurunan) Kas Bersih" value={cf.net_cash_flow} bold />
            <div className="flex items-center justify-between py-3 mt-2 bg-emerald-50 rounded-md px-4">
              <span className="font-display font-bold text-era-primary">Kas Akhir</span>
              <span className="font-display font-extrabold text-era-primary tabular text-lg">{formatIDR(cf.ending_cash)}</span>
            </div>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card className="p-6 bg-white border border-era-border rounded-xl max-w-3xl space-y-4">
            <h3 className="font-display font-bold">Catatan atas Laporan Keuangan (CALK)</h3>
            {d.notes.map((n, i) => (
              <div key={i}>
                <p className="font-semibold text-sm text-era-text">{n.title}</p>
                <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{n.body}</p>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
