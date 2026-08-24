import { useEffect, useState } from "react";
import { api, formatIDR } from "../lib/api";
import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge, InfoTip } from "../components/Common";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

function statusOf(key, v) {
  const higher = ["revenue", "gross_profit", "gross_margin", "net_profit", "net_margin", "current_ratio", "quick_ratio", "cash_ratio", "roa", "roe"];
  const th = {
    net_margin: [15, 8], gross_margin: [40, 25], current_ratio: [1.5, 1], quick_ratio: [1, 0.7],
    cash_ratio: [0.5, 0.2], debt_to_equity: [1, 2], expense_ratio: [80, 90], roa: [10, 5], roe: [15, 8],
  };
  const t = th[key];
  if (!t) return "green";
  const [warn, crit] = t;
  if (higher.includes(key)) return v >= warn ? "green" : v >= crit ? "yellow" : "red";
  return v <= warn ? "green" : v <= crit ? "yellow" : "red";
}

const FIN_META = [
  { key: "revenue", label: "Revenue", fmt: "c" }, { key: "gross_profit", label: "Gross Profit", fmt: "c" },
  { key: "gross_margin", label: "Gross Margin", fmt: "%" }, { key: "net_profit", label: "Net Profit", fmt: "c" },
  { key: "net_margin", label: "Net Margin", fmt: "%" }, { key: "expense_ratio", label: "Expense Ratio", fmt: "%" },
  { key: "current_ratio", label: "Current Ratio", fmt: "x" }, { key: "quick_ratio", label: "Quick Ratio", fmt: "x" },
  { key: "cash_ratio", label: "Cash Ratio", fmt: "x" }, { key: "debt_to_equity", label: "Debt / Equity", fmt: "x" },
  { key: "roa", label: "ROA", fmt: "%" }, { key: "roe", label: "ROE", fmt: "%" },
];

function fmtVal(v, fmt) {
  if (fmt === "c") return formatIDR(v, true);
  if (fmt === "%") return `${v}%`;
  if (fmt === "x") return `${v}x`;
  return v;
}

export default function KPI() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/kpi").then(({ data }) => setD(data)).catch(() => {}); }, []);
  if (!d) return <Skeleton className="h-96 rounded-xl" />;
  const f = d.financial;

  return (
    <div className="space-y-6" data-testid="kpi-page">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">KPI & Kesehatan Bisnis</h1>
        <p className="text-slate-500 text-sm mt-1">Financial & Service KPI dengan status GREEN / YELLOW / RED</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {FIN_META.map((m) => {
          const st = statusOf(m.key, f[m.key]);
          return (
            <Card key={m.key} data-testid={`fin-kpi-${m.key}`} className="p-5 bg-white border border-era-border rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-500">{m.label}</p>
                <span className={`h-2.5 w-2.5 rounded-full ${st === "green" ? "bg-era-success" : st === "yellow" ? "bg-era-warning" : "bg-era-critical"}`} />
              </div>
              <p className="font-display text-2xl font-extrabold tabular">{fmtVal(f[m.key], m.fmt)}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: "Total Jobs", v: d.service.total_jobs }, { l: "Revenue / Job", v: formatIDR(d.service.revenue_per_job) },
          { l: "Profit / Job", v: formatIDR(d.service.profit_per_job) }, { l: "Avg Invoice", v: formatIDR(d.service.average_invoice) },
        ].map((x) => (
          <Card key={x.l} className="p-5 bg-slate-50 border border-era-border rounded-xl">
            <p className="text-xs text-slate-500 mb-1">{x.l}</p>
            <p className="font-display text-lg font-extrabold tabular">{x.v}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="tech">
        <TabsList>
          <TabsTrigger value="tech" data-testid="tab-tech">Teknisi</TabsTrigger>
          <TabsTrigger value="cust" data-testid="tab-cust">Customer</TabsTrigger>
        </TabsList>
        <TabsContent value="tech">
          <Card className="bg-white border border-era-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Teknisi</TableHead><TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {d.technicians.map((t) => (
                  <TableRow key={t.name} data-testid={`tech-row-${t.name}`}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right tabular">{t.jobs}</TableCell>
                    <TableCell className="text-right tabular">{formatIDR(t.revenue)}</TableCell>
                    <TableCell className="text-right tabular">{formatIDR(t.profit)}</TableCell>
                    <TableCell className="text-right tabular">{t.margin}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="cust">
          <Card className="bg-white border border-era-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {d.customers.map((t) => (
                  <TableRow key={t.name} data-testid={`cust-row-${t.name}`}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right tabular">{t.jobs}</TableCell>
                    <TableCell className="text-right tabular">{formatIDR(t.revenue)}</TableCell>
                    <TableCell className="text-right tabular">{formatIDR(t.profit)}</TableCell>
                    <TableCell className="text-right tabular">{t.margin}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
