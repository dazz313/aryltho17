import { useState, useRef, useEffect } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { StructuredAnswer } from "../components/StructuredAnswer";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { PaperPlaneRight, Brain, Sparkle } from "@phosphor-icons/react";

const SUGGESTIONS = [
  "Apakah bisnis saya sehat?",
  "Kenapa laba bulan ini turun?",
  "Apa biaya terbesar saya?",
  "Customer mana yang paling menguntungkan?",
  "Teknisi mana yang paling produktif?",
  "Berapa omzet minimal agar tidak rugi?",
  "Apakah cashflow saya aman?",
  "Jika omzet naik 20%, berapa estimasi laba?",
];

export default function AskAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput(""); setLoading(true);
    try {
      const { data } = await api.post("/ai/ask", { question });
      setMessages((m) => [...m, { role: "ai", answer: data }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "ai", answer: { summary: formatApiErrorDetail(err.response?.data?.detail) || err.message, confidence: "low", metrics: [], findings: [], risks: [], recommendations: [], sources: [] } }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6" data-testid="ai-ask-page">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain size={30} weight="fill" className="text-era-primary" /> Ask Finance AI
        </h1>
        <p className="text-slate-500 text-sm mt-1">AI menjawab berdasarkan angka otoritatif dari Financial Engine — tidak mengarang angka.</p>
      </div>

      {messages.length === 0 && (
        <Card className="p-6 bg-white border border-era-border rounded-xl">
          <p className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-1.5"><Sparkle size={16} weight="fill" className="text-era-secondary" /> Coba tanyakan:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} data-testid={`suggestion-${s.slice(0, 10)}`} onClick={() => ask(s)}
                className="text-sm bg-emerald-50 hover:bg-emerald-100 text-era-primary rounded-full px-3.5 py-1.5 transition-colors border border-emerald-100">
                {s}
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-5">
        {messages.map((m, i) => (
          <div key={i}>
            {m.role === "user" ? (
              <div className="flex justify-end">
                <div className="bg-era-primary text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%] text-sm">{m.text}</div>
              </div>
            ) : (
              <StructuredAnswer a={m.answer} />
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span className="h-2 w-2 rounded-full bg-era-primary animate-pulse" />
            AI sedang menganalisis data keuangan...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="sticky bottom-4 flex gap-2">
        <Input data-testid="ai-input" value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Tanyakan apa saja tentang keuangan bisnis Anda..." className="h-12 bg-white shadow-sm" />
        <Button type="submit" disabled={loading} data-testid="ai-send"
          className="h-12 px-5 bg-era-primary hover:bg-emerald-800 rounded-md">
          <PaperPlaneRight size={18} weight="fill" />
        </Button>
      </form>
    </div>
  );
}
