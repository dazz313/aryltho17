import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { StructuredAnswer } from "../components/StructuredAnswer";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Warning, TrendDown, Receipt, ChartBar, Sparkle, CheckCircle } from "@phosphor-icons/react";

const TYPE_META = {
  expense_spike: { icon: ChartBar, label: "Lonjakan Biaya" },
  revenue_drop: { icon: TrendDown, label: "Penurunan Revenue" },
  low_margin_job: { icon: Receipt, label: "Margin Tidak Wajar" },
};

export default function Anomalies() {
  const [data, setData] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { api.get("/anomalies").then(({ data }) => setData(data)).catch(() => {}); }, []);

  const analyze = async () => {
    setAiLoading(true);
    try {
      const { data: res } = await api.get("/ai/anomaly-insights");
      setAi(res.ai);
    } catch (e) {}
    finally { setAiLoading(false); }
  };

  if (!data) return <Skeleton className="h-96 rounded-xl" />;
  const { anomalies, summary } = data;

  return (
    <div className="space-y-6" data-testid="anomalies-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
            <Warning size={28} weight="fill" className="text-era-warning" /> Deteksi Anomali
          </h1>
          <p className="text-slate-500 text-sm mt-1">Engine menandai lonjakan biaya, penurunan revenue, dan job dengan margin tak wajar secara otomatis.</p>
        </div>
        <Button onClick={analyze} disabled={aiLoading} data-testid="analyze-anomalies-ai" className="bg-era-primary hover:bg-emerald-800 rounded-md">
          <Sparkle size={16} weight="fill" className="mr-1.5" /> {aiLoading ? "Menganalisis..." : "Analisa dengan AI"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 bg-white border border-era-border rounded-xl">
          <p className="text-xs text-slate-500">Total Anomali</p>
          <p className="font-display text-2xl font-extrabold mt-1">{summary.total}</p>
        </Card>
        <Card className="p-5 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs text-red-600">Kritis (Merah)</p>
          <p className="font-display text-2xl font-extrabold mt-1 text-red-700">{summary.red}</p>
        </Card>
        <Card className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-600">Perhatian (Kuning)</p>
          <p className="font-display text-2xl font-extrabold mt-1 text-amber-700">{summary.yellow}</p>
        </Card>
      </div>

      {ai && <StructuredAnswer a={ai} />}

      {anomalies.length === 0 ? (
        <Card className="p-12 bg-white border border-era-border rounded-xl text-center">
          <CheckCircle size={40} weight="fill" className="mx-auto mb-3 text-era-success" />
          <p className="text-sm text-slate-500">Tidak ada anomali terdeteksi. Bisnis stabil.</p>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="anomaly-list">
          {anomalies.map((a) => {
            const meta = TYPE_META[a.type] || { icon: Warning, label: a.type };
            const Icon = meta.icon;
            const red = a.severity === "red";
            return (
              <Card key={a.id} data-testid={`anomaly-${a.id}`} className="p-5 bg-white border border-era-border rounded-xl flex items-start gap-4 hover:shadow-md transition-shadow">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${red ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                  <Icon size={22} weight="bold" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`h-2 w-2 rounded-full ${red ? "bg-era-critical" : "bg-era-warning"}`} />
                    <h3 className="font-display font-bold text-sm">{a.title}</h3>
                    <span className="text-[10px] uppercase tracking-wide bg-slate-100 rounded px-2 py-0.5 text-slate-500">{meta.label}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{a.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
