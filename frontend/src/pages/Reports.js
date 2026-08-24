import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { FilePdf, FileXls } from "@phosphor-icons/react";
import { toast } from "sonner";

const REPORTS = [
  { key: "pdf", title: "Financial Report (PDF)", desc: "Ringkasan P&L, margin, dan Financial Health Score.", url: "/reports/financial.pdf", file: "laporan_keuangan.pdf", icon: FilePdf, color: "text-red-600 bg-red-50" },
  { key: "xlsx", title: "Financial Report (Excel)", desc: "P&L dan Balance Sheet dalam format spreadsheet.", url: "/reports/financial.xlsx", file: "laporan_keuangan.xlsx", icon: FileXls, color: "text-emerald-600 bg-emerald-50" },
];

export default function Reports() {
  const download = async (r) => {
    try {
      const res = await api.get(r.url, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = r.file; a.click();
      URL.revokeObjectURL(url);
      toast.success("Laporan diunduh");
    } catch (e) { toast.error("Gagal mengunduh laporan"); }
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Generate & export laporan keuangan.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.key} className="p-6 bg-white border border-era-border rounded-xl flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${r.color}`}>
                <Icon size={24} weight="fill" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold">{r.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5 mb-3">{r.desc}</p>
                <Button onClick={() => download(r)} data-testid={`report-${r.key}`} className="bg-era-primary hover:bg-emerald-800 rounded-md">
                  Download
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
