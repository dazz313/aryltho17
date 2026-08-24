import { useEffect, useState } from "react";
import { api, formatIDR } from "../lib/api";
import { StructuredAnswer } from "../components/StructuredAnswer";
import { InfoTip } from "../components/Common";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Skeleton } from "../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Receipt, Sparkle, CheckCircle, Scales, Buildings, Percent } from "@phosphor-icons/react";

export default function TaxCenter() {
  const [pkp, setPkp] = useState(false);
  const [d, setD] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setD(null);
    api.get(`/tax/summary?pkp=${pkp}`).then(({ data }) => setD(data)).catch(() => {});
  }, [pkp]);

  const advice = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.get(`/ai/tax-advice?pkp=${pkp}`);
      setAi(data.ai);
    } catch (e) {} finally { setAiLoading(false); }
  };

  if (!d) return <Skeleton className="h-96 rounded-xl" />;
  const cmp = d.comparison;

  return (
    <div className="space-y-6" data-testid="tax-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt size={28} weight="fill" className="text-era-primary" /> Tax Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">Estimasi kewajiban pajak: PPh Final UMKM, PPh Badan, PPN, PPh 21 & 23. Semua angka bersifat estimasi.</p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="flex items-center gap-3 px-4 py-2 bg-white border border-era-border rounded-xl">
            <span className="text-sm text-slate-600">Status PKP</span>
            <Switch checked={pkp} onCheckedChange={setPkp} data-testid="pkp-toggle" />
            <span className={`text-xs font-semibold ${pkp ? "text-era-primary" : "text-slate-400"}`}>{pkp ? "PKP" : "Non-PKP"}</span>
          </Card>
          <Button onClick={advice} disabled={aiLoading} data-testid="tax-ai-advice" className="bg-era-primary hover:bg-emerald-800 rounded-md">
            <Sparkle size={16} weight="fill" className="mr-1.5" /> {aiLoading ? "Menganalisis..." : "Saran AI"}
          </Button>
        </div>
      </div>

      {/* Regime comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card data-testid="pph-final-card" className={`p-6 rounded-xl border-2 ${cmp.cheaper === "final" ? "border-era-primary bg-emerald-50" : "border-era-border bg-white"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scales size={20} weight="fill" className="text-era-primary" />
              <h3 className="font-display font-bold">PPh Final UMKM</h3>
            </div>
            {cmp.cheaper === "final" && <span className="text-[10px] font-bold uppercase bg-era-primary text-white rounded-full px-2 py-0.5">Termurah</span>}
          </div>
          <p className="text-xs text-slate-500 mt-1">0,5% × Peredaran Bruto (PP 55/2022)</p>
          <p className="font-display text-3xl font-extrabold text-era-primary tabular mt-3">{formatIDR(d.pph_final.annual)}</p>
          <p className="text-xs text-slate-500 mt-1">≈ {formatIDR(d.pph_final.monthly_avg)}/bulan</p>
        </Card>

        <Card data-testid="pph-badan-card" className={`p-6 rounded-xl border-2 ${cmp.cheaper === "badan" ? "border-era-primary bg-emerald-50" : "border-era-border bg-white"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Buildings size={20} weight="fill" className="text-era-secondary" />
              <h3 className="font-display font-bold">PPh Badan (Tarif Umum)</h3>
            </div>
            {cmp.cheaper === "badan" && <span className="text-[10px] font-bold uppercase bg-era-primary text-white rounded-full px-2 py-0.5">Termurah</span>}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            Tarif efektif {d.pph_badan.effective_rate_pct}% {d.pph_badan.facility_31e && <span className="bg-blue-50 text-era-secondary rounded px-1.5 py-0.5">Fasilitas Ps.31E</span>}
          </p>
          <p className="font-display text-3xl font-extrabold text-era-secondary tabular mt-3">{formatIDR(d.pph_badan.tax)}</p>
          <p className="text-xs text-slate-400 mt-1">Tanpa fasilitas (22%): {formatIDR(d.pph_badan.tax_without_facility)}</p>
        </Card>

        <Card className="p-6 rounded-xl bg-white border border-era-border flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-slate-500">Potensi Penghematan</p>
            <InfoTip what="Selisih antara kedua skema pajak." why="Membantu memilih skema yang paling efisien secara legal." />
          </div>
          <p className="font-display text-3xl font-extrabold text-era-primary tabular mt-2">{formatIDR(cmp.saving)}</p>
          <p className="text-sm text-slate-600 mt-2 flex items-center gap-1">
            <CheckCircle size={16} weight="fill" className="text-era-success" />
            Rekomendasi: <span className="font-semibold">{cmp.cheaper === "final" ? "PPh Final 0,5%" : "PPh Badan"}</span>
          </p>
        </Card>
      </div>

      {ai && <StructuredAnswer a={ai} />}

      {/* Other taxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="ppn-card" className="p-6 bg-white border border-era-border rounded-xl">
          <h3 className="font-display font-bold flex items-center gap-1.5"><Percent size={18} weight="bold" className="text-era-secondary" /> PPN {pkp ? "(12%)" : ""}</h3>
          {pkp ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">PPN Keluaran</span><span className="tabular">{formatIDR(d.ppn.output)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">PPN Masukan</span><span className="tabular">{formatIDR(d.ppn.input)}</span></div>
              <div className="flex justify-between font-bold border-t border-slate-100 pt-2"><span>PPN Terutang</span><span className="tabular text-era-primary">{formatIDR(d.ppn.payable)}</span></div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 mt-3">Status Non-PKP: tidak memungut PPN (omzet di bawah Rp4,8 M). Aktifkan toggle PKP untuk simulasi.</p>
          )}
        </Card>

        <Card data-testid="pph21-card" className="p-6 bg-white border border-era-border rounded-xl">
          <h3 className="font-display font-bold">PPh 21 (Gaji Karyawan)</h3>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Dasar (Beban Gaji)</span><span className="tabular">{formatIDR(d.pph21.payroll_base)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">PTKP (TK/0)</span><span className="tabular">{formatIDR(d.pph21.ptkp)}</span></div>
            <div className="flex justify-between font-bold border-t border-slate-100 pt-2"><span>Estimasi PPh 21</span><span className="tabular text-era-primary">{formatIDR(d.pph21.estimate)}</span></div>
          </div>
          {d.pph21.estimate === 0 && <p className="text-xs text-slate-400 mt-2">Gaji di bawah PTKP → tidak ada PPh 21 terutang.</p>}
        </Card>

        <Card data-testid="pph23-card" className="p-6 bg-white border border-era-border rounded-xl">
          <h3 className="font-display font-bold">PPh 23 (Jasa & Sewa)</h3>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Potong atas Sewa (2%)</span><span className="tabular">{formatIDR(d.pph23.withhold_on_rent)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Dipotong pelanggan (kredit)</span><span className="tabular">{formatIDR(d.pph23.credit_from_customers)}</span></div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Pelanggan badan dapat memotong 2% dari jasa Anda sebagai kredit pajak.</p>
        </Card>
      </div>

      {/* Monthly obligations */}
      <Card className="bg-white border border-era-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-display font-bold">Kalender Kewajiban Pajak</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Jenis Pajak</TableHead><TableHead>Frekuensi</TableHead>
            <TableHead>Jatuh Tempo</TableHead><TableHead className="text-right">Estimasi</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {d.monthly_obligations.map((o, i) => (
              <TableRow key={i} data-testid={`obligation-${o.type}`}>
                <TableCell className="font-medium">{o.tax}</TableCell>
                <TableCell><span className="text-xs bg-slate-100 rounded px-2 py-0.5">{o.freq}</span></TableCell>
                <TableCell className="text-slate-500 text-sm">{o.due}</TableCell>
                <TableCell className="text-right tabular font-semibold">{formatIDR(o.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <ul className="text-xs text-amber-800 space-y-1">
          {d.notes.map((n, i) => <li key={i}>• {n}</li>)}
        </ul>
      </div>
    </div>
  );
}
