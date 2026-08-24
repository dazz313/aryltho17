import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { ShieldCheck, Buildings } from "@phosphor-icons/react";

export default function Settings() {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/company").then(({ data }) => setCompany(data.company)).catch(() => {});
    api.get("/accounts").then(({ data }) => setAccounts(data.accounts)).catch(() => {});
    api.get("/audit-logs").then(({ data }) => setLogs(data.logs)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Perusahaan, Chart of Accounts, keamanan & audit log.</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company" data-testid="tab-company">Company</TabsTrigger>
          <TabsTrigger value="coa" data-testid="tab-coa">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          {!company ? <Skeleton className="h-40 rounded-xl" /> : (
            <Card className="p-6 bg-white border border-era-border rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Buildings size={20} weight="fill" className="text-era-primary" />
                <h3 className="font-display font-bold">Profil Perusahaan</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {[["Nama", company.name], ["Industri", company.industry], ["Metode Akuntansi", company.accounting_method],
                  ["Mata Uang", company.currency], ["Tahun Fiskal", company.fiscal_year], ["Owner", company.owner_email]].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-slate-100 py-2">
                    <span className="text-slate-500">{k}</span><span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="coa">
          <Card className="bg-white border border-era-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama Akun</TableHead><TableHead>Tipe</TableHead></TableRow></TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.code}>
                    <TableCell className="font-mono text-xs">{a.code}</TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell><span className="text-xs bg-slate-100 rounded px-2 py-0.5 capitalize">{a.type}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="bg-white border border-era-border rounded-xl overflow-hidden">
            <div className="p-4 flex items-center gap-2 border-b border-slate-100">
              <ShieldCheck size={18} weight="fill" className="text-era-primary" />
              <span className="text-sm font-semibold">Audit Log ({logs.length})</span>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Waktu</TableHead><TableHead>User</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-slate-500">{l.timestamp?.slice(0, 19).replace("T", " ")}</TableCell>
                    <TableCell className="text-sm">{l.user_name || l.user_email || "-"}</TableCell>
                    <TableCell><span className="text-xs bg-emerald-50 text-era-primary rounded px-2 py-0.5">{l.action}</span></TableCell>
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
