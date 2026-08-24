import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { StructuredAnswer } from "../components/StructuredAnswer";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Sparkle, ArrowClockwise } from "@phosphor-icons/react";

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/ai/insights").then(({ data }) => setData(data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6" data-testid="insights-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkle size={28} weight="fill" className="text-era-secondary" /> AI Insights
          </h1>
          <p className="text-slate-500 text-sm mt-1">Analisis otomatis kesehatan bisnis & rekomendasi prioritas.</p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" data-testid="refresh-insights" className="rounded-md border-era-border">
          <ArrowClockwise size={16} weight="bold" className="mr-1.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="p-10 bg-white border border-era-border rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span className="h-2 w-2 rounded-full bg-era-secondary animate-pulse" /> AI sedang menganalisis...
          </div>
        </Card>
      ) : (
        <StructuredAnswer a={data} />
      )}
    </div>
  );
}
