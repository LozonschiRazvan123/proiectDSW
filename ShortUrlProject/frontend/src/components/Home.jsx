import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import copy from "copy-to-clipboard";
import { ArrowRight, BarChart3, CheckCircle, Copy, Link as LinkIcon, AlertTriangle } from "lucide-react";

import Loader from "../components/Loader";
import { apiFetch, getApiBase } from "../lib/api";
import { enqueueShorten } from "../lib/offlineQueue";

const API_BASE = getApiBase();

export default function Home({ bumpDashboard, pendingCount }) {
  const nav = useNavigate();
  const [longUrl, setLongUrl] = useState("");
  const [shortCode, setShortCode] = useState(null);
  const [infoMsg, setInfoMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setInfoMsg(""); setShortCode(null);

    if (!navigator.onLine) {
      await enqueueShorten(longUrl);
      setInfoMsg("Ești OFFLINE. Cererea a fost salvată și se va sincroniza automat când revii online.");
      bumpDashboard();
      return;
    }

    setLoading(true);
    const { res, data, networkError } = await apiFetch("/api/shorten", {
      method: "POST",
      body: JSON.stringify({ longUrl }),
    });
    setLoading(false);

    if (networkError || !res) {
      await enqueueShorten(longUrl);
      setInfoMsg("Serverul nu e accesibil acum. Am salvat cererea offline și o sincronizez când revii online.");
      bumpDashboard();
      return;
    }

    if (!res.ok) {
      if (res.status >= 500) {
        await enqueueShorten(longUrl);
        setInfoMsg("Serverul are o problemă (500). Am salvat cererea offline și o sincronizez mai târziu.");
        bumpDashboard();
        return;
      }
      return setError(data?.error || "Eroare server");
    }

    setShortCode(data.shortCode);
    if (data.existing) setInfoMsg(data.msg || "Link existent");

    bumpDashboard();

    if (data.reactivated) setTimeout(() => nav("/dashboard", { replace: false }), 300);
  };

  const handleCopy = () => {
    copy(`${API_BASE}/${shortCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="relative z-10 w-full max-w-4xl px-4 pt-28 pb-10">
      <div className="text-center mb-10">
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
          Short<span className="text-indigo-300">Url</span>
        </h1>
        <p className="text-slate-300 text-lg mt-3">Creează link-uri scurte, QR și statistici.</p>

        {pendingCount > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 bg-yellow-500/15 border border-yellow-500/25 text-yellow-200 px-4 py-2 rounded-full text-sm">
            <AlertTriangle size={16} />
            Ai {pendingCount} cereri în coada offline (se vor sincroniza automat).
          </div>
        )}
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-[2rem] shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-0 sm:flex sm:gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
              <LinkIcon size={26} />
            </div>

            <input
              className="w-full py-5 pl-16 pr-4 rounded-3xl bg-slate-950/50 border-2 border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-white placeholder-slate-500 outline-none transition-all text-lg"
              placeholder="Lipește link-ul (https://...)"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
            />
          </div>

          <button
            disabled={loading}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader /> : <>Scurtează <ArrowRight size={22} /></>}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-2xl flex items-center gap-3">
            <AlertTriangle size={22} /> {error}
          </div>
        )}
        {infoMsg && (
          <div className="mt-4 bg-blue-500/20 border border-blue-500/30 text-blue-100 p-4 rounded-2xl">
            {infoMsg}
          </div>
        )}

        {shortCode && (
          <div className="mt-6 bg-slate-900/60 border border-indigo-500/30 rounded-[2rem] p-6">
            <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-2">Link scurt</p>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <a href={`${API_BASE}/${shortCode}`} target="_blank" className="text-3xl font-black text-white hover:text-indigo-300 transition break-all">
                {API_BASE.replace("http://", "").replace("https://", "")}/{shortCode}
              </a>

              <button
                onClick={handleCopy}
                className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition ${
                  copied ? "bg-emerald-500 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                {copied ? <CheckCircle size={22} /> : <Copy size={22} />}
                {copied ? "Copiat!" : "Copiază"}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-4 flex justify-center">
                <QRCodeCanvas value={`${API_BASE}/${shortCode}`} size={160} />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-center">
                <p className="text-white font-bold text-xl mb-2">Statistici</p>
                <Link to={`/stats/${shortCode}`} className="inline-flex items-center gap-2 text-indigo-300 hover:text-white font-semibold">
                  <BarChart3 size={18} /> Vezi /stats
                </Link>
                <p className="text-slate-400 mt-2 text-sm">Stats sunt vizibile doar owner-ului sau adminului.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
