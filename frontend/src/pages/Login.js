import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ChartLineUp } from "@phosphor-icons/react";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("owner@eracool.id");
  const [password, setPassword] = useState("eracool123");
  const [name, setName] = useState("");
  const [role, setRole] = useState("owner");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      let data;
      if (mode === "login") data = await login(email, password);
      else data = await register({ email, password, name, role });
      navigate(data.company_id ? "/dashboard" : "/setup");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative overflow-hidden bg-era-primary p-12 text-white">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?crop=entropy&cs=srgb&fm=jpg&q=85')", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <ChartLineUp size={26} weight="fill" />
          </div>
          <span className="font-display text-xl font-bold">EraCool AI Financial Analyst</span>
        </div>
        <div className="relative">
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight mb-4">
            Business Control Center<br />untuk bisnis service AC Anda
          </h1>
          <p className="text-white/80 text-base max-w-md">
            Financial Engine yang menghitung. AI yang menjelaskan, menyelidiki, dan merekomendasikan — dari data ke keputusan.
          </p>
        </div>
        <p className="relative text-white/60 text-sm">CV Eracool Teknik Solution · IDR · FY2025</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-era-bg">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-era-primary text-white">
              <ChartLineUp size={20} weight="fill" />
            </div>
            <span className="font-display font-bold text-lg">EraCool</span>
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight mb-1">
            {mode === "login" ? "Masuk ke akun Anda" : "Buat akun baru"}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {mode === "login" ? "Kelola keuangan bisnis dengan bantuan AI." : "Mulai analisis keuangan bisnis Anda."}
          </p>

          <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
            {mode === "register" && (
              <>
                <div>
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input id="name" data-testid="name-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nama Anda" />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger data-testid="role-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="finance">Finance / Admin</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" data-testid="email-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nama@perusahaan.id" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" data-testid="password-input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-era-critical bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="auth-error">{error}</p>}
            <Button type="submit" disabled={loading} data-testid="submit-btn"
              className="w-full bg-era-primary hover:bg-emerald-800 text-white rounded-md h-11 font-semibold">
              {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
            <button data-testid="toggle-mode" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-era-primary font-semibold hover:underline">
              {mode === "login" ? "Daftar" : "Masuk"}
            </button>
          </p>
          {mode === "login" && (
            <p className="text-center text-xs text-slate-400 mt-4">Demo: owner@eracool.id / eracool123</p>
          )}
        </div>
      </div>
    </div>
  );
}
