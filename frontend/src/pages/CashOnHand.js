import { useEffect, useState } from "react";
import { api, formatIDR } from "../lib/api";
import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { InfoTip } from "../components/Common";
import { Bank, Money, Wallet, Wrench, Buildings } from "@phosphor-icons/react";

const ICONS = { bank: Bank, office: Buildings, petty: Money, technician: Wrench, project: Wallet };
const KIND_LABEL = { bank: "Bank", office: "Kas Kantor", petty: "Kas Kecil", technician: "Kas Teknisi", project: "Kas Proyek" };

export default function CashOnHand() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/financial/cash-on-hand").then(({ data }) => setD(data)).catch(() => {}); }, []);
  if (!d) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-6" data-testid="coh-page">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Cash on Hand</h1>
        <p className="text-slate-500 text-sm mt-1">Posisi kas fisik & bank. Tidak semua kas harus di bank.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-era-primary text-white rounded-xl">
          <p className="text-sm text-white/80">Total Cash</p>
          <p className="font-display text-3xl font-extrabold tabular mt-1">{formatIDR(d.total_cash)}</p>
          <p className="text-xs text-white/70 mt-2">Bank + seluruh kas fisik</p>
        </Card>
        <Card className="p-6 bg-white border border-era-border rounded-xl">
          <p className="text-sm text-slate-500">Bank</p>
          <p className="font-display text-3xl font-extrabold tabular mt-1 text-era-secondary">{formatIDR(d.bank)}</p>
        </Card>
        <Card className="p-6 bg-white border border-era-border rounded-xl">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-slate-500">Cash on Hand (Fisik)</p>
            <InfoTip what="Total uang tunai fisik di luar bank." why="Sering terlupakan padahal bagian penting posisi kas." />
          </div>
          <p className="font-display text-3xl font-extrabold tabular mt-1 text-era-primary">{formatIDR(d.cash_on_hand)}</p>
        </Card>
      </div>

      <Card className="p-6 bg-white border border-era-border rounded-xl">
        <h3 className="font-display font-bold mb-4">Rincian Akun Kas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {d.detail.map((c) => {
            const Icon = ICONS[c.kind] || Money;
            return (
              <div key={c.code} className="flex items-center gap-3 p-4 rounded-lg border border-slate-100 hover:border-era-primary/30 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-era-primary">
                  <Icon size={20} weight="bold" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">{c.name}</p>
                  <p className="text-xs text-slate-400">{KIND_LABEL[c.kind]}</p>
                </div>
                <span className="font-display font-bold tabular">{formatIDR(c.amount)}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
