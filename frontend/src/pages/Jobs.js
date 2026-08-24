import { useEffect, useState } from "react";
import { api, formatIDR } from "../lib/api";
import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { MagnifyingGlass } from "@phosphor-icons/react";

export default function Jobs() {
  const [jobs, setJobs] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { api.get("/jobs").then(({ data }) => setJobs(data.jobs)).catch(() => {}); }, []);
  if (!jobs) return <Skeleton className="h-96 rounded-xl" />;
  const filtered = jobs.filter((j) =>
    [j.job_number, j.customer, j.technician, j.service_type].join(" ").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6" data-testid="jobs-page">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Service Jobs</h1>
        <p className="text-slate-500 text-sm mt-1">{jobs.length} pekerjaan service · FY2025</p>
      </div>
      <div className="relative max-w-sm">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input data-testid="jobs-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari job, customer, teknisi..." className="pl-9" />
      </div>
      <Card className="bg-white border border-era-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto era-scroll">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Job No</TableHead><TableHead>Tanggal</TableHead><TableHead>Customer</TableHead>
              <TableHead>Teknisi</TableHead><TableHead>Tipe</TableHead>
              <TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map((j) => {
                const margin = j.revenue ? ((j.profit / j.revenue) * 100).toFixed(0) : 0;
                return (
                  <TableRow key={j.job_number} data-testid={`job-${j.job_number}`}>
                    <TableCell className="font-mono text-xs">{j.job_number}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{j.date}</TableCell>
                    <TableCell className="font-medium">{j.customer}</TableCell>
                    <TableCell>{j.technician}</TableCell>
                    <TableCell><span className="text-xs bg-slate-100 rounded px-2 py-0.5">{j.service_type}</span></TableCell>
                    <TableCell className="text-right tabular">{formatIDR(j.revenue)}</TableCell>
                    <TableCell className="text-right tabular">{formatIDR(j.profit)}</TableCell>
                    <TableCell className="text-right tabular">{margin}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
