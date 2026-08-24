import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import {
  ChartLineUp, Wallet, Receipt, Bank, Users, Brain, FileText,
  Gear, SignOut, List, X, Gauge, Sparkle, ArrowsClockwise, UploadSimple,
} from "@phosphor-icons/react";

const NAV = [
  { label: "Dashboard", to: "/dashboard", icon: Gauge, testId: "nav-dashboard" },
  {
    group: "Financial", items: [
      { label: "Profit & Loss", to: "/financial/pnl", icon: ChartLineUp, testId: "nav-pnl" },
      { label: "Balance Sheet", to: "/financial/balance-sheet", icon: Wallet, testId: "nav-bs" },
      { label: "Cash Flow", to: "/financial/cash-flow", icon: ArrowsClockwise, testId: "nav-cf" },
      { label: "Cash on Hand", to: "/financial/cash-on-hand", icon: Bank, testId: "nav-coh" },
    ],
  },
  {
    group: "Analysis", items: [
      { label: "KPI & Kesehatan", to: "/kpi", icon: Receipt, testId: "nav-kpi" },
      { label: "Service Jobs", to: "/business/jobs", icon: Users, testId: "nav-jobs" },
    ],
  },
  {
    group: "AI Analyst", items: [
      { label: "Ask Finance AI", to: "/ai/ask", icon: Brain, testId: "nav-ai-ask" },
      { label: "AI Insights", to: "/ai/insights", icon: Sparkle, testId: "nav-ai-insights" },
    ],
  },
  {
    group: "Data & Report", items: [
      { label: "Import Data", to: "/import", icon: UploadSimple, testId: "nav-import" },
      { label: "Reports", to: "/reports", icon: FileText, testId: "nav-reports" },
      { label: "Settings", to: "/settings", icon: Gear, testId: "nav-settings" },
    ],
  },
];

function NavItem({ item, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} onClick={onClick} data-testid={item.testId}
      className={({ isActive }) => cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
        isActive ? "bg-era-primary text-white shadow-sm" : "text-slate-600 hover:bg-emerald-50 hover:text-era-primary"
      )}>
      <Icon size={18} weight="bold" />
      {item.label}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => { await logout(); navigate("/login"); };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-era-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-era-primary text-white">
          <ChartLineUp size={20} weight="fill" />
        </div>
        <div className="leading-tight">
          <p className="font-display font-bold text-[15px] text-era-text">EraCool</p>
          <p className="text-[11px] text-slate-500">AI Financial Analyst</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto era-scroll px-3 py-4 space-y-4">
        <NavItem item={NAV[0]} onClick={() => setOpen(false)} />
        {NAV.slice(1).map((section) => (
          <div key={section.group}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{section.group}</p>
            <div className="space-y-0.5">
              {section.items.map((it) => <NavItem key={it.to} item={it} onClick={() => setOpen(false)} />)}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-era-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-era-secondary text-white text-sm font-bold">
            {(user?.name || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 leading-tight overflow-hidden">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500 capitalize">{user?.role}</p>
          </div>
          <button data-testid="logout-btn" onClick={doLogout} className="text-slate-400 hover:text-era-critical transition-colors">
            <SignOut size={18} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-era-bg">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-white border-r border-era-border z-30">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white border-r border-era-border">{SidebarContent}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-era-border bg-white/95 backdrop-blur px-4 lg:px-8">
          <button className="lg:hidden text-slate-600" onClick={() => setOpen(true)} data-testid="menu-toggle">
            {open ? <X size={22} /> : <List size={22} />}
          </button>
          <div className="flex-1" />
          <span className="text-xs text-slate-500 hidden sm:block">CV Eracool Teknik Solution · FY2025 · IDR</span>
        </header>
        <main className="p-4 lg:p-8 max-w-[1400px]">{children}</main>
      </div>
    </div>
  );
}
