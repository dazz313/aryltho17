import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import CompanySetup from "./pages/CompanySetup";
import Dashboard from "./pages/Dashboard";
import ProfitLoss from "./pages/ProfitLoss";
import BalanceSheet from "./pages/BalanceSheet";
import CashFlow from "./pages/CashFlow";
import CashOnHand from "./pages/CashOnHand";
import KPI from "./pages/KPI";
import Jobs from "./pages/Jobs";
import AskAI from "./pages/AskAI";
import Insights from "./pages/Insights";
import Reconciliation from "./pages/Reconciliation";
import Anomalies from "./pages/Anomalies";
import TaxCenter from "./pages/TaxCenter";
import FinancialStatements from "./pages/FinancialStatements";
import Documents from "./pages/Documents";
import Import from "./pages/Import";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-era-bg">
      <div className="h-8 w-8 rounded-full border-2 border-era-primary border-t-transparent animate-spin" />
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading || user === null) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.company_id && location.pathname !== "/setup") return <Navigate to="/setup" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const page = (el) => <Protected><Layout>{el}</Layout></Protected>;

  return (
    <Routes>
      <Route path="/login" element={loading ? <Loader /> : user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/setup" element={<Protected><CompanySetup /></Protected>} />
      <Route path="/dashboard" element={page(<Dashboard />)} />
      <Route path="/financial/pnl" element={page(<ProfitLoss />)} />
      <Route path="/financial/balance-sheet" element={page(<BalanceSheet />)} />
      <Route path="/financial/cash-flow" element={page(<CashFlow />)} />
      <Route path="/financial/cash-on-hand" element={page(<CashOnHand />)} />
      <Route path="/financial/statements" element={page(<FinancialStatements />)} />
      <Route path="/tax" element={page(<TaxCenter />)} />
      <Route path="/kpi" element={page(<KPI />)} />
      <Route path="/business/jobs" element={page(<Jobs />)} />
      <Route path="/ai/ask" element={page(<AskAI />)} />
      <Route path="/ai/insights" element={page(<Insights />)} />
      <Route path="/reconciliation" element={page(<Reconciliation />)} />
      <Route path="/anomalies" element={page(<Anomalies />)} />
      <Route path="/documents" element={page(<Documents />)} />
      <Route path="/import" element={page(<Import />)} />
      <Route path="/reports" element={page(<Reports />)} />
      <Route path="/settings" element={page(<Settings />)} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
