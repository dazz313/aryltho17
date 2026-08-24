import { useEffect, useState, useCallback } from "react";
import { api, fetchFileBlobUrl, formatApiErrorDetail } from "../lib/api";
import { FileThumb } from "../components/FilePreview";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { UploadSimple, DownloadSimple, Trash, FolderOpen } from "@phosphor-icons/react";
import { toast } from "sonner";

const CATEGORIES = [
  { v: "receipt", l: "Bukti Transaksi" },
  { v: "document", l: "Arsip Dokumen" },
];

export default function Documents() {
  const [tab, setTab] = useState("receipt");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [attachedTo, setAttachedTo] = useState("");
  const [uploadCat, setUploadCat] = useState("receipt");
  const [fileToUpload, setFileToUpload] = useState(null);

  const load = useCallback(() => {
    api.get(`/files?category=${tab}`).then(({ data }) => setFiles(data.files)).catch(() => {});
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const doUpload = async (e) => {
    e.preventDefault();
    if (!fileToUpload) { toast.error("Pilih file dulu"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", fileToUpload);
      fd.append("category", uploadCat);
      if (uploadCat === "receipt" && attachedTo) { fd.append("attached_to", attachedTo); fd.append("attached_type", "job"); }
      await api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("File berhasil diunggah");
      setFileToUpload(null); setAttachedTo("");
      if (uploadCat === tab) load(); else setTab(uploadCat);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Gagal unggah");
    } finally { setBusy(false); }
  };

  const download = async (f) => {
    try {
      const url = await fetchFileBlobUrl(f.id);
      const a = document.createElement("a"); a.href = url; a.download = f.original_filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) { toast.error("Gagal mengunduh"); }
  };

  const remove = async (f) => {
    try { await api.delete(`/files/${f.id}`); toast.success("File dihapus"); load(); }
    catch (e) { toast.error("Gagal menghapus"); }
  };

  return (
    <div className="space-y-6" data-testid="documents-page">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
          <FolderOpen size={28} weight="fill" className="text-era-primary" /> Dokumen & Media
        </h1>
        <p className="text-slate-500 text-sm mt-1">Simpan bukti transaksi, nota, invoice, dan arsip dokumen bisnis Anda.</p>
      </div>

      <Card className="p-6 bg-white border border-era-border rounded-xl">
        <form onSubmit={doUpload} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end" data-testid="upload-form">
          <div>
            <Label>Kategori</Label>
            <Select value={uploadCat} onValueChange={setUploadCat}>
              <SelectTrigger data-testid="upload-category"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {uploadCat === "receipt" && (
            <div>
              <Label>Lampirkan ke Job (opsional)</Label>
              <Input data-testid="attached-to" value={attachedTo} onChange={(e) => setAttachedTo(e.target.value)} placeholder="mis. JOB-2025-0001" />
            </div>
          )}
          <div>
            <Label>File (gambar / PDF, maks 10MB)</Label>
            <Input type="file" accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.csv,.xlsx,.xls"
              onChange={(e) => setFileToUpload(e.target.files?.[0] || null)} data-testid="file-input" />
          </div>
          <Button type="submit" disabled={busy} data-testid="upload-btn" className="bg-era-primary hover:bg-emerald-800 rounded-md">
            <UploadSimple size={16} weight="bold" className="mr-1.5" /> {busy ? "Mengunggah..." : "Unggah"}
          </Button>
        </form>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {CATEGORIES.map((c) => <TabsTrigger key={c.v} value={c.v} data-testid={`tab-${c.v}`}>{c.l}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {files.length === 0 ? (
        <Card className="p-12 bg-white border border-era-border rounded-xl text-center text-slate-400">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Belum ada file pada kategori ini.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="file-grid">
          {files.map((f) => (
            <Card key={f.id} data-testid={`file-${f.id}`} className="bg-white border border-era-border rounded-xl overflow-hidden group">
              <div className="h-36 overflow-hidden border-b border-slate-100">
                <FileThumb file={f} className="h-36 w-full object-cover" />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate" title={f.original_filename}>{f.original_filename}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {(f.size / 1024).toFixed(0)} KB{f.attached_to ? ` · ${f.attached_to}` : ""}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => download(f)} data-testid={`download-${f.id}`} className="flex-1 rounded-md h-8">
                    <DownloadSimple size={14} weight="bold" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(f)} data-testid={`delete-${f.id}`} className="rounded-md h-8 text-era-critical border-red-200 hover:bg-red-50">
                    <Trash size={14} weight="bold" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
