import { useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { UploadSimple, CheckCircle, FileXls, ArrowRight, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const FIELDS = [
  { key: "date", label: "Tanggal", required: true },
  { key: "description", label: "Deskripsi", required: false },
  { key: "amount", label: "Nominal", required: true },
  { key: "type", label: "Tipe (income/expense)", required: false },
];
const STEPS = ["Upload", "Mapping", "Validasi", "Selesai"];

export default function Import() {
  const [step, setStep] = useState(0);
  const [uploaded, setUploaded] = useState(null);
  const [mapping, setMapping] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/import/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setUploaded(data);
      setMapping(data.suggested_mapping || {});
      setStep(1);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Gagal upload");
    } finally { setBusy(false); }
  };

  const commit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/import/commit", {
        filename: uploaded.filename, rows: uploaded.rows || uploaded.preview, mapping,
      });
      setResult(data); setStep(3);
      toast.success(`${data.imported} transaksi diimpor`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Gagal impor");
    } finally { setBusy(false); }
  };

  const deleteImported = async () => {
    const { data } = await api.delete("/data/imported");
    toast.success(`${data.deleted} baris data impor dihapus`);
  };

  return (
    <div className="space-y-6" data-testid="import-page">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-slate-500 text-sm mt-1">Upload Excel/CSV → deteksi kolom → mapping → validasi → impor.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
              i <= step ? "bg-era-primary text-white" : "bg-slate-100 text-slate-400")}>{i + 1}</div>
            <span className={cn("text-sm hidden sm:block", i <= step ? "text-era-text font-semibold" : "text-slate-400")}>{s}</span>
            {i < STEPS.length - 1 && <ArrowRight size={16} className="text-slate-300 mx-1" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="p-10 bg-white border border-era-border rounded-xl">
          <label className="flex flex-col items-center justify-center gap-3 cursor-pointer border-2 border-dashed border-slate-200 rounded-xl p-12 hover:border-era-primary/40 transition-colors" data-testid="upload-dropzone">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-era-primary">
              <UploadSimple size={26} weight="bold" />
            </div>
            <p className="font-semibold text-slate-700">{busy ? "Membaca file..." : "Klik untuk pilih file XLSX / CSV"}</p>
            <p className="text-xs text-slate-400">Kolom yang didukung: Tanggal, Deskripsi, Nominal, Tipe</p>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} data-testid="file-input" disabled={busy} />
          </label>
        </Card>
      )}

      {step === 1 && uploaded && (
        <Card className="p-6 bg-white border border-era-border rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileXls size={20} weight="fill" className="text-era-primary" />
            {uploaded.filename} · {uploaded.row_count} baris · {uploaded.columns.length} kolom
          </div>
          <p className="text-sm font-semibold">Petakan kolom file ke field sistem:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-sm text-slate-600">{f.label} {f.required && <span className="text-era-critical">*</span>}</label>
                <Select value={mapping[f.key] || ""} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}>
                  <SelectTrigger data-testid={`map-${f.key}`}><SelectValue placeholder="Pilih kolom..." /></SelectTrigger>
                  <SelectContent>
                    {uploaded.columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(0)} className="rounded-md">Kembali</Button>
            <Button onClick={() => setStep(2)} disabled={!mapping.date || !mapping.amount} data-testid="to-validate"
              className="bg-era-primary hover:bg-emerald-800 rounded-md">Lanjut ke Validasi</Button>
          </div>
        </Card>
      )}

      {step === 2 && uploaded && (
        <Card className="p-6 bg-white border border-era-border rounded-xl space-y-4">
          <p className="text-sm font-semibold">Preview data (20 baris pertama):</p>
          <div className="overflow-x-auto era-scroll border border-slate-100 rounded-lg">
            <Table>
              <TableHeader><TableRow>
                {FIELDS.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>
                {uploaded.preview.slice(0, 12).map((row, i) => (
                  <TableRow key={i}>
                    {FIELDS.map((f) => <TableCell key={f.key} className="text-sm">{mapping[f.key] ? String(row[mapping[f.key]] ?? "") : "-"}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="rounded-md">Kembali</Button>
            <Button onClick={commit} disabled={busy} data-testid="commit-import" className="bg-era-primary hover:bg-emerald-800 rounded-md">
              {busy ? "Mengimpor..." : "Impor Data"}
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && result && (
        <Card className="p-10 bg-white border border-era-border rounded-xl text-center space-y-3">
          <CheckCircle size={48} weight="fill" className="text-era-success mx-auto" />
          <h3 className="font-display text-xl font-bold">Impor Berhasil</h3>
          <p className="text-slate-500 text-sm">{result.imported} transaksi diimpor · {result.skipped} baris dilewati.</p>
          {result.errors?.length > 0 && (
            <div className="text-left text-xs text-amber-700 bg-amber-50 rounded-lg p-3 max-w-md mx-auto">
              {result.errors.slice(0, 5).map((e, i) => <p key={i}>Baris {e.row}: {e.message}</p>)}
            </div>
          )}
          <div className="flex justify-center gap-2 pt-2">
            <Button onClick={() => { setStep(0); setUploaded(null); setResult(null); }} className="bg-era-primary hover:bg-emerald-800 rounded-md">Impor Lagi</Button>
            <Button onClick={deleteImported} variant="outline" data-testid="delete-imported" className="rounded-md text-era-critical border-red-200 hover:bg-red-50">
              <Trash size={16} className="mr-1.5" /> Hapus Data Impor
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
