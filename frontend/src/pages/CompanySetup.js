import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Buildings, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function CompanySetup() {
  const navigate = useNavigate();
  const { setCompanyId } = useAuth();
  const [form, setForm] = useState({
    name: "CV Eracool Teknik Solution", industry: "AC / Refrigeration Service",
    accounting_method: "Accrual", currency: "IDR", fiscal_year: 2025,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/company/setup", { ...form, fiscal_year: Number(form.fiscal_year) });
      setCompanyId(data.company_id);
      toast.success("Perusahaan berhasil dibuat");
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-era-bg p-6">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-0 bg-white rounded-2xl border border-era-border overflow-hidden shadow-sm">
        <div className="hidden md:block relative bg-era-primary">
          <img src="https://images.pexels.com/photos/6471913/pexels-photo-6471913.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
            alt="AC technician" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="relative p-8 text-white h-full flex flex-col justify-end">
            <Buildings size={40} weight="fill" className="mb-3" />
            <h2 className="font-display text-2xl font-bold mb-2">Company Setup</h2>
            <p className="text-white/80 text-sm">Buat profil perusahaan Anda. Mulai dari kosong, lalu import data keuangan asli Anda.</p>
          </div>
        </div>
        <form onSubmit={submit} className="p-8 space-y-4" data-testid="setup-form">
          <h1 className="font-display text-2xl font-bold tracking-tight">Profil Perusahaan</h1>
          <div>
            <Label>Nama Perusahaan</Label>
            <Input data-testid="company-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <Label>Industri</Label>
            <Select value={form.industry} onValueChange={(v) => set("industry", v)}>
              <SelectTrigger data-testid="industry-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AC / Refrigeration Service">AC / Refrigeration Service</SelectItem>
                <SelectItem value="General Service">General Service</SelectItem>
                <SelectItem value="Trading">Trading</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Metode Akuntansi</Label>
              <Select value={form.accounting_method} onValueChange={(v) => set("accounting_method", v)}>
                <SelectTrigger data-testid="method-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Accrual">Accrual</SelectItem>
                  <SelectItem value="Cash">Cash Basis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tahun Fiskal</Label>
              <Input data-testid="fiscal-year" type="number" value={form.fiscal_year} onChange={(e) => set("fiscal_year", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Mata Uang</Label>
            <Input value={form.currency} disabled />
          </div>
          {error && <p className="text-sm text-era-critical bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
          <Button type="submit" disabled={loading} data-testid="setup-submit"
            className="w-full bg-era-primary hover:bg-emerald-800 text-white rounded-md h-11 font-semibold">
            <CheckCircle size={18} weight="bold" className="mr-1.5" />
            {loading ? "Menyiapkan data..." : "Buat & Muat Data Demo"}
          </Button>
        </form>
      </div>
    </div>
  );
}
