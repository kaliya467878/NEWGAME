"use client";

import { useState, useEffect, useTransition } from "react";
import { validatePredictorKeyAction, getPredictionAction } from "@/lib/actions/predictor";

type PredictionOutcome = {
  number: number;
  color: string;
  size: string;
  confidence: number;
};

type HistoryItem = {
  period: string;
  color: string;
  size: string;
  number: number;
  confidence: number;
};

export default function PredictorPage() {
  const [key, setKey] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState("");
  const [periodInput, setPeriodInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [predictError, setPredictError] = useState("");
  
  const [isPending, startTransition] = useTransition();
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [scanStatus, setScanStatus] = useState("Initializing neural systems...");
  const [prediction, setPrediction] = useState<PredictionOutcome | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load access key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("predictor_access_key");
    const savedDesc = localStorage.getItem("predictor_user_desc");
    const savedHistory = sessionStorage.getItem("predictor_session_history");

    if (savedKey) {
      startTransition(async () => {
        const res = await validatePredictorKeyAction(savedKey);
        if (res.success) {
          setKey(savedKey);
          setDescription(savedDesc);
          if (savedHistory) {
            setHistory(JSON.parse(savedHistory));
          }
        } else {
          localStorage.removeItem("predictor_access_key");
          localStorage.removeItem("predictor_user_desc");
        }
      });
    }
  }, []);

  // Handle access key authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    if (!loginInput.trim()) return;

    startTransition(async () => {
      const res = await validatePredictorKeyAction(loginInput.trim());
      if (res.success && res.key) {
        setKey(res.key);
        setDescription(res.description || "Authorized User");
        localStorage.setItem("predictor_access_key", res.key);
        localStorage.setItem("predictor_user_desc", res.description || "Authorized User");
      } else {
        setLoginError(res.error || "Authentication failed.");
      }
    });
  };

  // Terminate device session
  const handleLogout = () => {
    setKey(null);
    setDescription(null);
    setPrediction(null);
    setHistory([]);
    localStorage.removeItem("predictor_access_key");
    localStorage.removeItem("predictor_user_desc");
    sessionStorage.removeItem("predictor_session_history");
  };

  // Run the color predictor analysis
  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setPredictError("");
    
    if (!periodInput.trim() || !key) return;

    setLoadingPredict(true);
    setPrediction(null);

    // Dynamic scanning overlay status messages
    const steps = [
      { time: 0, text: "Uplinking to Wingo round arrays..." },
      { time: 450, text: "Extracting historical sequence values..." },
      { time: 900, text: "Calculating standard deviations..." },
      { time: 1350, text: "Mapping delta-vector variables..." },
      { time: 1800, text: "Finalizing outcome projection..." }
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setScanStatus(step.text);
      }, step.time);
    });

    try {
      const res = await getPredictionAction(periodInput.trim(), key);
      
      // Let the scanner run for at least 2.2 seconds for realistic premium UI feel
      setTimeout(() => {
        setLoadingPredict(false);
        if (res.success && res.prediction) {
          setPrediction(res.prediction);
          
          // Prepend prediction to history (avoid duplicates)
          const newEntry: HistoryItem = {
            period: periodInput.trim(),
            ...res.prediction
          };
          setHistory(prev => {
            const filtered = prev.filter(h => h.period !== periodInput.trim());
            const updated = [newEntry, ...filtered].slice(0, 10);
            sessionStorage.setItem("predictor_session_history", JSON.stringify(updated));
            return updated;
          });
        } else {
          setPredictError(res.error || "Failed to analyze period.");
          if (res.error?.toLowerCase().includes("unauthorized")) {
            handleLogout();
          }
        }
      }, 2200);

    } catch (err) {
      setTimeout(() => {
        setLoadingPredict(false);
        setPredictError("Server communication failure.");
      }, 2200);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--theme-bg-card)] text-slate-100 flex flex-col justify-between items-center p-4 relative font-sans">
      
      {/* Styles Injection for Dynamic Animations */}
      <style jsx global>{`
        .stars-bg {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          z-index: 1;
          background-image: 
            radial-gradient(1.5px 1.5px at 10% 10%, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 50% 60%, rgba(255,255,255,0.7), rgba(0,0,0,0)),
            radial-gradient(1.2px 1.2px at 85% 30%, rgba(255,255,255,0.9), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 70% 80%, rgba(255,255,255,0.6), rgba(0,0,0,0));
          background-size: 250px 250px;
          opacity: 0.12;
          animation: spinBg 180s linear infinite;
        }
        @keyframes spinBg {
          from { background-position: 0 0; }
          to { background-position: 250px 500px; }
        }
        .radar-line {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          border-radius: 50%;
          background: conic-gradient(from 0deg, transparent 50%, rgba(245, 158, 11, 0.15) 85%, #f59e0b 100%);
          animation: spinRadar 2.2s linear infinite;
          mask: radial-gradient(circle, transparent 40%, black 41%);
          -webkit-mask: radial-gradient(circle, transparent 40%, black 41%);
        }
        @keyframes spinRadar {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .text-glow-red { text-shadow: 0 0 15px rgba(239, 68, 68, 0.5); }
        .text-glow-green { text-shadow: 0 0 15px rgba(16, 185, 129, 0.5); }
        .text-glow-violet { text-shadow: 0 0 15px rgba(168, 85, 247, 0.5); }
        .bg-red-gradient { background: radial-gradient(circle at 35% 35%, #f87171 0%, #ef4444 85%); }
        .bg-green-gradient { background: radial-gradient(circle at 35% 35%, #34d399 0%, #10b981 85%); }
        .bg-red-violet-gradient { background: linear-gradient(135deg, #ef4444 50%, #a855f7 50%); }
        .bg-green-violet-gradient { background: var(--theme-bg-card); }
      `}</style>

      <div className="stars-bg"></div>

      {/* Main app container */}
      <div className="w-full max-w-lg flex flex-col gap-6 z-10 py-6">
        
        {/* Header section */}
        <header className="flex justify-between items-center px-2">
          <div className="font-extrabold text-lg tracking-wider text-slate-100 flex items-center gap-1.5">
            <span className="text-amber-500">NOVA</span>PREDICTOR
          </div>
          {key && (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs font-semibold text-rose-400/80 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg px-2.5 py-1.5 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Disconnect
            </button>
          )}
        </header>

        {/* Glassmorphic Container Card */}
        <section className="bg-slate-900/60 border border-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative overflow-hidden transition-all duration-300">
          
          {/* 1. Login Screen */}
          {!key ? (
            <div className="flex flex-col gap-6">
              <div className="text-center flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  Predict Wingo Colors
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Verify your device using a secure access key to unlock our advanced deterministic analytics engine.
                </p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Secure Access Key
                  </label>
                  <div className="relative flex items-center">
                    <svg className="absolute left-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input 
                      type="text" 
                      placeholder="NOVA-XXXX-XXXX" 
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value.toUpperCase())}
                      className="w-full pl-12 pr-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition"
                      required
                    />
                  </div>
                  {loginError && <p className="text-xs text-rose-500 font-medium">{loginError}</p>}
                </div>
                
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 disabled:from-amber-600/50 disabled:to-amber-700/50 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 hover:brightness-110 active:scale-95 transition"
                >
                  {isPending ? "Connecting to vault..." : "Authenticate Key"}
                </button>
              </form>
            </div>
          ) : (
            
            // 2. Predictor App Screen
            <div className="flex flex-col gap-6">
              
              {/* User display header */}
              <div className="flex justify-between items-start pb-4 border-b border-white/5">
                <div>
                  <h3 className="font-semibold text-slate-100">
                    Welcome, <span className="text-amber-500">{description}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 tracking-wider">
                    KEY: {key.substring(0, 9)}...
                  </p>
                </div>
              </div>

              {/* Enter Period Number */}
              <form onSubmit={handlePredict} className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Period / Round Number
                </label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="Enter period (e.g. 20260724001)"
                    value={periodInput}
                    onChange={(e) => setPeriodInput(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={loadingPredict}
                    className="px-5 py-3 bg-amber-500 hover:brightness-115 disabled:bg-amber-600/40 text-slate-950 font-bold rounded-xl transition"
                  >
                    Analyze
                  </button>
                </div>
                {predictError && <p className="text-xs text-rose-500 font-medium">{predictError}</p>}
              </form>

              {/* Scanning loading state */}
              {loadingPredict && (
                <div className="flex flex-col items-center justify-center py-6 gap-4">
                  <div className="relative w-28 h-28 border border-amber-500/10 rounded-full bg-amber-500/[0.02] flex items-center justify-center">
                    <div className="radar-line"></div>
                    <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_15px_#f59e0b]"></div>
                  </div>
                  <div className="text-center">
                    <h4 className="text-xs font-bold text-amber-500 tracking-widest uppercase animate-pulse">
                      Environment Scan Active
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">{scanStatus}</p>
                  </div>
                </div>
              )}

              {/* Prediction outcome layout */}
              {prediction && !loadingPredict && (
                <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
                  <div className="text-[10px] font-bold text-slate-400 tracking-widest text-center uppercase">
                    Calculated Prediction
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Color Outcome */}
                    <div className={`bg-slate-900/40 border rounded-xl p-4 flex flex-col items-center justify-center text-center transition ${
                      prediction.color.toLowerCase() === 'red' ? 'border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.06)]' :
                      prediction.color.toLowerCase() === 'green' ? 'border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.06)]' :
                      'border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.06)]'
                    }`}>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                        Next Color
                      </span>
                      <span className={`text-xl font-bold tracking-tight ${
                        prediction.color.toLowerCase() === 'red' ? 'text-red-500 text-glow-red' :
                        prediction.color.toLowerCase() === 'green' ? 'text-emerald-500 text-glow-green' :
                        'text-purple-500 text-glow-violet'
                      }`}>
                        {prediction.color}
                      </span>
                      <div className="flex gap-1.5 mt-2">
                        {prediction.color.split("-").map(c => (
                          <span key={c} className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            c.toLowerCase() === 'red' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            c.toLowerCase() === 'green' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Size Outcome */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                        Next Size
                      </span>
                      <span className="text-xl font-bold text-slate-200">
                        {prediction.size}
                      </span>
                      <span className="text-[9px] text-slate-500 mt-1.5">
                        {prediction.size === 'Big' ? 'Value threshold >= 5' : 'Value threshold <= 4'}
                      </span>
                    </div>

                    {/* Suggested Number Ball */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-2">
                        Next Number
                      </span>
                      <div className={`w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-lg font-bold text-[var(--theme-text)] shadow-md ${
                        prediction.color.toLowerCase() === 'red' ? 'bg-red-gradient' :
                        prediction.color.toLowerCase() === 'green' ? 'bg-green-gradient' :
                        prediction.color.toLowerCase() === 'red-violet' ? 'bg-red-violet-gradient' :
                        'bg-green-violet-gradient'
                      }`}>
                        {prediction.number}
                      </div>
                    </div>

                    {/* Confidence Progress Ring */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">
                        Confidence
                      </span>
                      <div className="relative w-14 h-14 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle className="stroke-white/5 fill-none" strokeWidth="10" cx="50" cy="50" r="40" />
                          <circle 
                            className="stroke-amber-500 fill-none transition-all duration-700" 
                            strokeWidth="10" 
                            strokeLinecap="round"
                            cx="50" 
                            cy="50" 
                            r="40" 
                            strokeDasharray="251.2"
                            strokeDashoffset={251.2 * (1 - prediction.confidence / 100)}
                          />
                        </svg>
                        <span className="absolute text-xs font-bold text-amber-500">
                          {prediction.confidence}%
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* History Table */}
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <span className="w-1 h-3.5 bg-amber-500 rounded"></span>
                  Recent Round Analyses
                </div>
                <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-950/20">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-950/40 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5">
                        <tr>
                          <th className="px-4 py-2.5">Period</th>
                          <th className="px-4 py-2.5">Color</th>
                          <th className="px-4 py-2.5">Size</th>
                          <th className="px-4 py-2.5">Number</th>
                          <th className="px-4 py-2.5">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {history.length === 0 ? (
                          <tr>
                            <td colspan={5} className="px-4 py-6 text-center text-slate-500">
                              No history analyzed yet this session.
                            </td>
                          </tr>
                        ) : (
                          history.map((h, i) => (
                            <tr key={i} className="hover:bg-white/[0.01]">
                              <td className="px-4 py-2.5 font-semibold text-slate-300">
                                {h.period}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex gap-1">
                                  {h.color.split("-").map(c => (
                                    <span key={c} className={`text-[7px] font-extrabold px-1 rounded uppercase ${
                                      c.toLowerCase() === 'red' ? 'text-red-400 bg-red-500/10' :
                                      c.toLowerCase() === 'green' ? 'text-emerald-400 bg-emerald-500/10' :
                                      'text-purple-400 bg-purple-500/10'
                                    }`}>
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-slate-400">{h.size}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-block text-center font-bold text-[10px] w-5.5 h-5.5 leading-5.5 rounded-full text-[var(--theme-text)] ${
                                  h.color.toLowerCase() === 'red' ? 'bg-red-gradient' :
                                  h.color.toLowerCase() === 'green' ? 'bg-green-gradient' :
                                  h.color.toLowerCase() === 'red-violet' ? 'bg-red-violet-gradient' :
                                  'bg-green-violet-gradient'
                                }`}>
                                  {h.number}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-amber-500 font-semibold">{h.confidence}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}
          
        </section>

        {/* Footer */}
        <footer className="text-center text-[10px] text-slate-500/80 leading-relaxed px-4">
          &copy; 2026 Nova Predictor Labs. Authorized testing session under secure sandbox. Strictly for demonstration.
        </footer>

      </div>
    </main>
  );
}
