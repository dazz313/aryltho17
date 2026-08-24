import { useState } from "react";
import { api, formatIDR, formatApiErrorDetail } from "../lib/api";
import { StructuredAnswer } from "../components/StructuredAnswer";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
import { Scales, UploadSimple, CheckCircle, WarningCircle, Sparkle, Bank } from "@phosphor-icons/react";
import { toast } from "sonner";

function Amount({ v }) {
  return <span className={`tabular font-semibold ${v < 0 ? "text-era-critical" : "text-emerald-700"}`}>{formatIDR(v)}</span>;
}

export default function Reconciliation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [ai, setAi] = useState(null);

  const runDemo = async () => {
    setLoading(true); setAi(null);
    try {
      const { data } = await api.get("/reconciliation/demo?month=6");
      setData(data);
    } catch (e) { toast.error("Gagal menjalankan demo"); }
    finally { setLoading(false); }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setAi(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/reconciliation/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setData(data);
      toast.success("Rekonsiliasi selesai");
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Gagal upload"); }
    finally { setLoading(false); }
  };

  const analyze = async () => {
    setAiLoading(true);
    try {
      const { data: res } = await api.post("/ai/reconciliation-explain", { result: data.result });
      setAi(res);
    } catch (e) { toast.error("Gagal analisa AI"); }
    finally { setAiLoading(false); }
  };

  const r = data?.result;

  return (
    <div className="space-y-6" data-testid="reconciliation-page">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
          <Scales size={28} weight="fill" className="text-era-primary" /> Rekonsiliasi Bank
        </h1>
        <p className="text-slate-500 text-sm mt-1">Cocokkan catatan buku dengan rekening koran. AI menjelaskan selisih beserta buktinya — tanpa menuduh tanpa bukti.</p>
      </div>

      <Card className="p-6 bg-white border border-era-border rounded-xl flex flex-wrap items-center gap-3">
        <Button onClick={runDemo} disabled={loading} data-testid="run-demo-recon" className="bg-era-primary hover:bg-emerald-800 rounded-md">
          <Bank size={16} weight="bold" className="mr-1.5" /> Jalankan Demo (Juni 2025)
        </Button>
        <span className="text-slate-400 text-sm">atau</span>
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-era-secondary hover:underline" data-testid="upload-statement-label">
          <UploadSimple size={18} weight="bold" /> Upload Rekening Koran (CSV/XLSX)
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} data-testid="statement-file-input" />
        </label>
      </Card>

      {loading && <Skeleton className="h-40 rounded-xl" />}

      {r && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 bg-white border border-era-border rounded-xl">
              <p className="text-xs text-slate-500">Saldo Buku</p>
              <p className="font-display text-xl font-extrabold tabular mt-1">{formatIDR(r.book_balance)}</p>
            </Card>
            <Card className="p-5 bg-white border border-era-border rounded-xl">
              <p className="text-xs text-slate-500">Saldo Rek. Koran</p>
              <p className="font-display text-xl font-extrabold tabular mt-1">{formatIDR(r.statement_balance)}</p>
            </Card>
            <Card data-testid="recon-difference" className={`p-5 rounded-xl border ${r.reconciled ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <p className="text-xs text-slate-500">Selisih</p>
              <p className={`font-display text-xl font-extrabold tabular mt-1 ${r.reconciled ? "text-emerald-700" : "text-amber-700"}`}>{formatIDR(r.difference)}</p>
            </Card>
            <Card className="p-5 bg-white border border-era-border rounded-xl">
              <p className="text-xs text-slate-500">Transaksi Cocok</p>
              <p className="font-display text-xl font-extrabold tabular mt-1">{r.matched_count} / {r.book_count}</p>
            </Card>
          </div>

          <div className="flex items-center gap-2">
            {r.reconciled ? (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle size={18} weight="fill" /> Rekening cocok</span>
            ) : (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700"><WarningCircle size={18} weight="fill" /> Ada {r.unmatched_book.length + r.unmatched_statement.length} item tidak cocok</span>
            )}
            <div className="flex-1" />
            <Button onClick={analyze} disabled={aiLoading} data-testid="analyze-recon-ai" variant="outline" className="rounded-md border-era-primary/30 text-era-primary">
              <Sparkle size={16} weight="fill" className="mr-1.5" /> {aiLoading ? "Menganalisis..." : "Analisa dengan AI"}
            </Button>
          </div>

          {ai && <StructuredAnswer a={ai} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border border-era-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 text-sm font-semibold text-slate-600">Ada di Buku, tidak di Rek. Koran ({r.unmatched_book.length})</div>
              <Table>
                <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Keterangan</TableHead><TableHead className="text-right">Nominal</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.unmatched_book.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-slate-400 text-sm py-6">Tidak ada</TableCell></TableRow> :
                    r.unmatched_book.map((t, i) => (
                      <TableRow key={i}><TableCell className="text-sm text-slate-500">{t.date}</TableCell><TableCell className="text-sm">{t.description}</TableCell><TableCell className="text-right"><Amount v={t.amount} /></TableCell></TableRow>
                    ))}
                </TableBody>
              </Table>
            </Card>
            <Card className="bg-white border border-era-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 text-sm font-semibold text-slate-600">Ada di Rek. Koran, tidak di Buku ({r.unmatched_statement.length})</div>
              <Table>
                <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Keterangan</TableHead><TableHead className="text-right">Nominal</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.unmatched_statement.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-slate-400 text-sm py-6">Tidak ada</TableCell></TableRow> :
                    r.unmatched_statement.map((t, i) => (
                      <TableRow key={i}><TableCell className="text-sm text-slate-500">{t.date}</TableCell><TableCell className="text-sm">{t.description}</TableCell><TableCell className="text-right"><Amount v={t.amount} /></TableCell></TableRow>
                    ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}

      {!r && !loading && (
        <Card className="p-12 bg-white border border-era-border rounded-xl text-center text-slate-400">
          <Scales size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Jalankan demo atau upload rekening koran untuk memulai rekonsiliasi.</p>
        </Card>
      )}
    </div>
  );
}
