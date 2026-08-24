import { Card } from "./ui/card";
import { ConfidenceBadge } from "./Common";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { CheckCircle, Warning, Lightbulb, Database } from "@phosphor-icons/react";

export function StructuredAnswer({ a }) {
  if (!a) return null;
  return (
    <div className="space-y-4" data-testid="ai-answer">
      {a.summary && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-era-secondary mb-1">Kesimpulan</p>
          <p className="text-sm text-slate-700 leading-relaxed">{a.summary}</p>
        </div>
      )}

      {a.metrics?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {a.metrics.map((m, i) => (
            <div key={i} className="bg-white border border-era-border rounded-lg p-3">
              <p className="text-[11px] text-slate-500">{m.label}</p>
              <p className="font-display font-bold text-sm mt-0.5 tabular">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {a.findings?.length > 0 && (
          <Section icon={CheckCircle} color="text-era-primary" title="Temuan" items={a.findings} />
        )}
        {a.risks?.length > 0 && (
          <Section icon={Warning} color="text-era-warning" title="Risiko" items={a.risks} />
        )}
      </div>

      {a.recommendations?.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={18} weight="fill" className="text-era-primary" />
            <p className="font-display font-bold text-sm">Rekomendasi</p>
          </div>
          <ul className="space-y-1.5">
            {a.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-era-primary font-bold">›</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <ConfidenceBadge level={a.confidence} />
        {a.sources?.length > 0 && (
          <Accordion type="single" collapsible className="w-full max-w-sm">
            <AccordionItem value="src" className="border-none">
              <AccordionTrigger className="text-xs text-slate-500 py-1 hover:no-underline">
                <span className="flex items-center gap-1.5"><Database size={14} /> Data Lineage ({a.sources.length})</span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="text-xs text-slate-500 space-y-1">
                  {a.sources.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, color, title, items }) {
  return (
    <Card className="p-4 bg-white border border-era-border rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} weight="fill" className={color} />
        <p className="font-display font-bold text-sm">{title}</p>
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => <li key={i} className="text-sm text-slate-600">• {it}</li>)}
      </ul>
    </Card>
  );
}
