import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { Info } from "@phosphor-icons/react";
import { cn } from "../lib/utils";

const STATUS_STYLES = {
  green: { dot: "bg-era-success", text: "text-emerald-700", bg: "bg-emerald-50", label: "Sehat", border: "border-emerald-200" },
  yellow: { dot: "bg-era-warning", text: "text-amber-700", bg: "bg-amber-50", label: "Perhatian", border: "border-amber-200" },
  red: { dot: "bg-era-critical", text: "text-red-700", bg: "bg-red-50", label: "Kritis", border: "border-red-200" },
};

export function StatusBadge({ level = "green", children, testId }) {
  const s = STATUS_STYLES[level] || STATUS_STYLES.green;
  return (
    <span data-testid={testId}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border", s.bg, s.text, s.border)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {children || s.label}
    </span>
  );
}

export function InfoTip({ what, why, testId }) {
  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        <button data-testid={testId} className="text-slate-400 hover:text-era-primary transition-colors" aria-label="Penjelasan">
          <Info size={16} weight="bold" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 bg-white border border-era-border shadow-lg z-50">
        {what && (
          <div className="mb-2">
            <p className="text-xs font-bold text-era-primary uppercase tracking-wide mb-0.5">Apa ini?</p>
            <p className="text-sm text-slate-700">{what}</p>
          </div>
        )}
        {why && (
          <div>
            <p className="text-xs font-bold text-era-secondary uppercase tracking-wide mb-0.5">Kenapa penting?</p>
            <p className="text-sm text-slate-700">{why}</p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

export function ConfidenceBadge({ level }) {
  const map = { high: "green", medium: "yellow", low: "red" };
  const labelMap = { high: "Tinggi", medium: "Sedang", low: "Rendah" };
  return <StatusBadge level={map[level] || "yellow"}>{`Confidence: ${labelMap[level] || level}`}</StatusBadge>;
}
