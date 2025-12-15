import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import copy from "copy-to-clipboard";
import { format } from "date-fns";
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Copy as CopyIcon,
  Link as LinkIcon,
  AlertTriangle,
  LayoutDashboard,
  LogIn,
  UserPlus,
  LogOut,
  Trash2,
  Pencil,
  ExternalLink,
  Globe,
  TrendingUp,
  Clock,
} from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

import {
  apiFetch,
  clearToken,
  getApiBase,
  getToken,
  setToken,
} from "./lib/api";
import { enqueueShorten, countPending } from "./lib/offlineQueue";
import { syncPendingShortens } from "./lib/syncQueue";

const API_BASE = getApiBase();

// ---------------- UI ----------------
const Loader = () => (
  <div className="flex justify-center p-2">
    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
  </div>
);

const Background = () => (
  <div className="fixed inset-0 z-0 overflow-hidden bg-slate-900">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950" />
    <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob" />
    <div className="absolute top-0 -right-4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-2000" />
    <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-4000" />
  </div>
);

// ---------------- ROUTES GUARDS ----------------
function ProtectedRoute({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ role, children }) {
  if (role !== "admin") return <Navigate to="/" replace />;
  return children;
}

// ---------------- NAVBAR (responsive + hamburger) ----------------
function Navbar({ authed, role, onLogout }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = () => {
    setOpen(false);
    onLogout();
    nav("/login", { replace: true });
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50">
      <div className="px-4 sm:px-6 py-4 flex justify-between items-center backdrop-blur-xl bg-slate-950/40 border-b border-white/10">
        <Link
          to="/"
          className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="w-9 h-9 rounded-2xl bg-indigo-500 flex items-center justify-center">
            S
          </span>
          Short<span className="text-indigo-300">Url</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-2">
          {authed && role === "admin" && (
            <Link
              to="/admin"
              className="text-slate-200/80 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10"
            >
              <LayoutDashboard size={18} /> Admin
            </Link>
          )}

          {authed ? (
            <>
              <Link
                to="/dashboard"
                className="text-slate-200/80 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10"
              >
                <BarChart3 size={18} /> Dashboard
              </Link>
              <button
                onClick={logout}
                className="text-slate-200/80 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10"
              >
                <LogOut size={18} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-slate-200/80 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10"
              >
                <LogIn size={18} /> Login
              </Link>
              <Link
                to="/register"
                className="text-slate-200/80 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-indigo-600 px-4 py-2 rounded-full border border-indigo-400/30 hover:bg-indigo-500"
              >
                <UserPlus size={18} /> Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-white/90 bg-white/5 border border-white/10 rounded-2xl px-3 py-2"
          aria-label="Menu"
        >
          <span className="block w-6 h-0.5 bg-white mb-1.5" />
          <span className="block w-6 h-0.5 bg-white mb-1.5" />
          <span className="block w-6 h-0.5 bg-white" />
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden px-4 pb-4 pt-3 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
          <div className="flex flex-col gap-2">
            {authed && role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="w-full text-slate-200/90 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-3 rounded-2xl border border-white/10 hover:bg-white/10"
              >
                <LayoutDashboard size={18} /> Admin
              </Link>
            )}

            {authed ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="w-full text-slate-200/90 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-3 rounded-2xl border border-white/10 hover:bg-white/10"
                >
                  <BarChart3 size={18} /> Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="w-full text-slate-200/90 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-3 rounded-2xl border border-white/10 hover:bg-white/10"
                >
                  <LogOut size={18} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="w-full text-slate-200/90 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-3 rounded-2xl border border-white/10 hover:bg-white/10"
                >
                  <LogIn size={18} /> Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="w-full text-white transition flex items-center gap-2 text-sm font-bold bg-indigo-600 px-4 py-3 rounded-2xl border border-indigo-400/30 hover:bg-indigo-500"
                >
                  <UserPlus size={18} /> Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// ---------------- LOGIN ----------------
function Login({ onAuth, onRole }) {
  const nav = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [loading, setL] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (getToken()) nav("/", { replace: true });
  }, [nav]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setL(true);

    const { res, data } = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    setL(false);
    if (!res?.ok) return setErr(data?.error || "Eroare login");

    setToken(data.token);
    onAuth(true);
    onRole(data.role);
    nav("/", { replace: true });
  };

  return (
    <div className="relative z-10 w-full max-w-md pt-24 sm:pt-28 px-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
        <h1 className="text-3xl font-black text-white mb-6">Login</h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full p-4 rounded-2xl bg-slate-950/60 border border-white/10 text-white outline-none"
            placeholder="username"
            value={username}
            onChange={(e) => setU(e.target.value)}
          />
          <input
            className="w-full p-4 rounded-2xl bg-slate-950/60 border border-white/10 text-white outline-none"
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setP(e.target.value)}
          />

          {err && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-3 rounded-xl flex gap-2 items-center">
              <AlertTriangle size={18} /> {err}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl"
          >
            {loading ? <Loader /> : "Sign in"}
          </button>
        </form>

        <p className="text-slate-400 text-sm mt-4">
          Nu ai cont?{" "}
          <Link to="/register" className="text-indigo-300 hover:text-white">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

// ---------------- REGISTER ----------------
function Register({ onAuth, onRole }) {
  const nav = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [loading, setL] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (getToken()) nav("/", { replace: true });
  }, [nav]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setL(true);

    const { res, data } = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    setL(false);
    if (!res?.ok) return setErr(data?.error || "Eroare register");

    setToken(data.token);
    onAuth(true);
    onRole(data.role);
    nav("/", { replace: true });
  };

  return (
    <div className="relative z-10 w-full max-w-md pt-24 sm:pt-28 px-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
        <h1 className="text-3xl font-black text-white mb-6">Register</h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full p-4 rounded-2xl bg-slate-950/60 border border-white/10 text-white outline-none"
            placeholder="username (min 3)"
            value={username}
            onChange={(e) => setU(e.target.value)}
          />
          <input
            className="w-full p-4 rounded-2xl bg-slate-950/60 border border-white/10 text-white outline-none"
            placeholder="password (min 6)"
            type="password"
            value={password}
            onChange={(e) => setP(e.target.value)}
          />

          {err && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-3 rounded-xl flex gap-2 items-center">
              <AlertTriangle size={18} /> {err}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl"
          >
            {loading ? <Loader /> : "Create account"}
          </button>
        </form>

        <p className="text-slate-400 text-sm mt-4">
          Ai deja cont?{" "}
          <Link to="/login" className="text-indigo-300 hover:text-white">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

// ---------------- HOME ----------------
function Home({ bumpDashboard, pendingCount, onSyncedNavigate }) {
  const nav = useNavigate();
  const [longUrl, setLongUrl] = useState("");
  const [shortCode, setShortCode] = useState(null);
  const [infoMsg, setInfoMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");
    setShortCode(null);

    if (!longUrl?.trim()) {
      setError("Te rog pune un URL.");
      return;
    }

    // 1) offline -> coadă
    if (!navigator.onLine) {
      await enqueueShorten(longUrl);
      setInfoMsg(
        "Ești OFFLINE. Cererea a fost salvată și se va sincroniza automat când revii online."
      );
      bumpDashboard();
      return;
    }

    // 2) online -> încercăm server
    setLoading(true);
    const { res, data, networkError } = await apiFetch("/api/shorten", {
      method: "POST",
      body: JSON.stringify({ longUrl }),
    });
    setLoading(false);

    // server inaccesibil -> coadă
    if (networkError || !res) {
      await enqueueShorten(longUrl);
      setInfoMsg(
        "Serverul nu e accesibil acum. Am salvat cererea offline și o sincronizez când revii online."
      );
      bumpDashboard();
      return;
    }

    if (!res.ok) {
      // 500 -> fallback coadă
      if (res.status >= 500) {
        await enqueueShorten(longUrl);
        setInfoMsg(
          "Serverul are o problemă (500). Am salvat cererea offline și o sincronizez mai târziu."
        );
        bumpDashboard();
        return;
      }
      setError(data?.error || "Eroare server");
      return;
    }

    setShortCode(data.shortCode);
    if (data.existing) setInfoMsg(data.msg || "Link existent");

    bumpDashboard();

    // dacă serverul zice că a reactivat, te duce la dashboard
    if (data.reactivated) {
      setTimeout(() => nav("/dashboard", { replace: false }), 300);
    }
  };

  const handleCopy = () => {
    copy(`${API_BASE}/${shortCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  // (opțional) dacă vrei să navighezi automat după sync:
  // vei primi `onSyncedNavigate(code)` din App când sync reușește.
  useEffect(() => {
    if (!onSyncedNavigate) return;
    // nu apelăm setState aici ca să evităm warnings ESLint, e callback extern
  }, [onSyncedNavigate]);

  return (
    <div className="relative z-10 w-full max-w-4xl px-4 pt-24 sm:pt-28 pb-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight">
          Short<span className="text-indigo-300">Url</span>
        </h1>
        <p className="text-slate-300 text-base sm:text-lg mt-3">
          Creează link-uri scurte, QR și statistici.
        </p>

        {pendingCount > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 bg-yellow-500/15 border border-yellow-500/25 text-yellow-200 px-4 py-2 rounded-full text-sm">
            <AlertTriangle size={16} />
            Ai {pendingCount} cereri în coada offline (se vor sincroniza automat).
          </div>
        )}
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-[2rem] shadow-2xl">
        {/* ✅ responsive form (buton sub input pe mobile) */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
              <LinkIcon size={24} />
            </div>

            <input
              className="w-full py-4 sm:py-6 pl-14 sm:pl-16 pr-4 rounded-3xl bg-slate-950/50 border-2 border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-white placeholder-slate-500 outline-none transition-all text-base sm:text-lg"
              placeholder="Lipește link-ul (https://...)"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
            />
          </div>

          <button
            disabled={loading}
            className="w-full sm:w-auto sm:ml-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 sm:px-8 py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader /> : <>Scurtează <ArrowRight size={20} /></>}
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
            <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-2">
              Link scurt
            </p>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <a
                href={`${API_BASE}/${shortCode}`}
                target="_blank"
                rel="noreferrer"
                className="text-2xl sm:text-3xl font-black text-white hover:text-indigo-300 transition break-all"
              >
                {API_BASE.replace("http://", "").replace("https://", "")}/{shortCode}
              </a>

              <button
                onClick={handleCopy}
                className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition ${
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                {copied ? <CheckCircle size={22} /> : <CopyIcon size={22} />}
                {copied ? "Copiat!" : "Copiază"}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-4 flex justify-center">
                <QRCodeCanvas value={`${API_BASE}/${shortCode}`} size={160} />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-center">
                <p className="text-white font-bold text-xl mb-2">Statistici</p>
                <Link
                  to={`/stats/${shortCode}`}
                  className="inline-flex items-center gap-2 text-indigo-300 hover:text-white font-semibold"
                >
                  <BarChart3 size={18} /> Vezi /stats
                </Link>
                <p className="text-slate-400 mt-2 text-sm">
                  Stats sunt vizibile doar owner-ului sau adminului.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- STATS ----------------
function Stats() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setL] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { res, data } = await apiFetch(`/api/stats/${code}`);
      if (!alive) return;
      if (!res?.ok) setData({ error: data?.error || "Eroare" });
      else setData(data);
      setL(false);
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  if (loading) return <div className="relative z-10 pt-24 sm:pt-28 text-white"><Loader /></div>;
  if (!data || data.error)
    return (
      <div className="relative z-10 pt-24 sm:pt-28 text-white text-center text-xl sm:text-2xl px-4">
        {data?.error || "Eroare"}
      </div>
    );

  return (
    <div className="relative z-10 w-full max-w-6xl px-4 pt-24 sm:pt-28 pb-10">
      <Link
        to="/"
        className="inline-flex items-center text-indigo-300 hover:text-white mb-8 transition text-base sm:text-lg font-medium bg-white/5 px-5 sm:px-6 py-3 rounded-full border border-white/10"
      >
        <ArrowRight className="rotate-180 mr-3" size={22} /> Înapoi
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">
            Total click-uri
          </p>
          <p className="text-5xl sm:text-6xl font-black text-white mt-2">{data.visits}</p>
          <p className="text-slate-500 text-sm mt-2">
            Owner: <span className="text-slate-200 font-semibold">{data.owner}</span>
          </p>
        </div>

        <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-[2rem] p-6">
          <p className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-2">
            Link scurt
          </p>
          <a
            href={`${API_BASE}/${code}`}
            target="_blank"
            rel="noreferrer"
            className="text-white text-lg sm:text-2xl font-bold flex gap-2 items-center break-all"
          >
            <ExternalLink /> {API_BASE.replace("https://", "").replace("http://", "")}/{code}
          </a>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 mb-6">
        <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
          Destinație
        </p>
        <a
          href={data.longUrl}
          target="_blank"
          rel="noreferrer"
          className="text-white text-base sm:text-xl font-semibold break-all hover:text-indigo-300"
        >
          {data.longUrl}
        </a>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Clock className="text-indigo-300" /> Istoric (ultimele 50)
          </h3>
          <span className="text-xs font-bold bg-green-500/20 text-green-300 px-3 py-1 rounded-full border border-green-500/20">
            LIVE
          </span>
        </div>

        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="bg-black/30 text-slate-400 text-xs uppercase tracking-wider sticky top-0">
              <tr>
                <th className="p-4">IP</th>
                <th className="p-4">Țară</th>
                <th className="p-4">Oraș</th>
                <th className="p-4">Data</th>
                <th className="p-4">User-Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(data.history || []).length ? (
                data.history.map((v, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="p-4 font-mono text-slate-200">{v.ip}</td>
                    <td className="p-4 text-slate-200">{v.country}</td>
                    <td className="p-4 text-slate-200">{v.city}</td>
                    <td className="p-4 text-slate-400">
                      {v.date ? format(new Date(v.date), "dd MMM yyyy, HH:mm") : "-"}
                    </td>
                    <td
                      className="p-4 text-slate-500 max-w-[180px] sm:max-w-[320px] truncate"
                      title={v.userAgent}
                    >
                      {v.userAgent}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-10 text-center text-slate-400" colSpan={5}>
                    Încă nu sunt vizite.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------- DASHBOARD ----------------
function Dashboard({ refreshKey }) {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setL] = useState(true);
  const [error, setErr] = useState("");
  const [editing, setEditing] = useState(null);
  const [newUrl, setNewUrl] = useState("");

  const load = async () => {
    setErr("");
    setL(true);

    const { res, data } = await apiFetch("/api/user/links");
    setL(false);

    if (!res?.ok) {
      if (res?.status === 401) {
        setErr("Neautorizat.");
        nav("/login");
        return;
      }
      setErr(data?.error || "Eroare");
      return;
    }
    setItems(data.items || []);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const del = async (code) => {
    if (!confirm(`Ștergi /${code}?`)) return;
    const { res, data } = await apiFetch(`/api/user/links/${code}`, {
      method: "DELETE",
    });
    if (!res?.ok) return alert(data?.error || "Eroare delete");
    load();
  };

  const startEdit = (it) => {
    setEditing(it.code);
    setNewUrl(it.longUrl);
  };

  const saveEdit = async () => {
    const code = editing;
    const { res, data } = await apiFetch(`/api/user/links/${code}`, {
      method: "PUT",
      body: JSON.stringify({ longUrl: newUrl }),
    });
    if (!res?.ok) return alert(data?.error || "Eroare update");
    setEditing(null);
    setNewUrl("");
    load();
  };

  if (loading) return <div className="relative z-10 pt-24 sm:pt-28 text-white"><Loader /></div>;

  return (
    <div className="relative z-10 w-full max-w-6xl px-4 pt-24 sm:pt-28 pb-10">
      <h1 className="text-3xl sm:text-4xl font-black text-white mb-6 flex items-center gap-2">
        <BarChart3 className="text-indigo-300" /> Dashboard (link-urile tale)
      </h1>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-2xl flex items-center gap-2 mb-6">
          <AlertTriangle /> {error}
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4 sm:p-6">
        {items.length === 0 ? (
          <p className="text-slate-300">Nu ai link-uri încă. Creează unul pe Home.</p>
        ) : (
          <div className="space-y-4">
            {items.map((it) => (
              <div
                key={it.code}
                className="bg-slate-950/40 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-white font-black text-xl sm:text-2xl">/{it.code}</div>
                  <div className="text-slate-400 text-sm break-all">{it.longUrl}</div>
                  <div className="text-slate-500 text-xs mt-1">
                    Visits: <span className="text-slate-200 font-bold">{it.visits}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-white flex items-center gap-2"
                    href={`${API_BASE}/${it.code}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={18} /> Open
                  </a>

                  <Link
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-white flex items-center gap-2"
                    to={`/stats/${it.code}`}
                  >
                    <BarChart3 size={18} /> Stats
                  </Link>

                  <button
                    onClick={() => startEdit(it)}
                    className="px-4 py-2 rounded-xl bg-indigo-600/70 hover:bg-indigo-600 text-white flex items-center gap-2"
                  >
                    <Pencil size={18} /> Edit
                  </button>

                  <button
                    onClick={() => del(it.code)}
                    className="px-4 py-2 rounded-xl bg-red-600/50 hover:bg-red-600 text-white flex items-center gap-2"
                  >
                    <Trash2 size={18} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-6 bg-indigo-600/15 border border-indigo-500/30 rounded-[2rem] p-6">
          <h2 className="text-white font-bold text-xl mb-3">Edit /{editing}</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              className="flex-1 p-4 rounded-2xl bg-slate-950/60 border border-white/10 text-white outline-none"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
            />
            <button
              onClick={saveEdit}
              className="px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setNewUrl("");
              }}
              className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-200 hover:text-white font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- ADMIN DASHBOARD ----------------
function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setL] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { res, data } = await apiFetch("/api/admin/dashboard");
      if (!alive) return;
      if (!res?.ok) setData({ error: data?.error || "Eroare" });
      else setData(data);
      setL(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="relative z-10 pt-24 sm:pt-28 text-white"><Loader /></div>;
  if (!data || data.error)
    return (
      <div className="relative z-10 pt-24 sm:pt-28 text-white text-center text-xl sm:text-2xl px-4">
        {data?.error || "Eroare"}
      </div>
    );

  return (
    <div className="relative z-10 w-full max-w-7xl px-4 pt-24 sm:pt-28 pb-10">
      <h1 className="text-3xl sm:text-4xl font-black text-white mb-8 flex items-center gap-2">
        <LayoutDashboard className="text-indigo-300" /> Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-indigo-600/20 border border-indigo-500/30 p-6 sm:p-8 rounded-[2rem]">
          <p className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-2">
            Total link-uri
          </p>
          <p className="text-5xl sm:text-6xl font-black text-white">{data.totalLinks}</p>
        </div>
        <div className="bg-emerald-600/10 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem]">
          <p className="text-emerald-200 text-sm font-bold uppercase tracking-wider mb-2">
            Total vizite
          </p>
          <p className="text-5xl sm:text-6xl font-black text-white">{data.totalVisits}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 sm:p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="text-yellow-300" /> Top link-uri
          </h3>
          <div className="space-y-4">
            {(data.topLinks || []).map((l) => (
              <div
                key={l.code}
                className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10"
              >
                <div className="truncate pr-4">
                  <div className="text-indigo-300 font-bold text-lg">/{l.code}</div>
                  <div className="text-slate-500 text-xs truncate max-w-[340px]">
                    {l.longUrl}
                  </div>
                  <div className="text-slate-600 text-xs">Owner: {l.owner}</div>
                </div>
                <div className="text-2xl font-black text-white">
                  {l.visits} <span className="text-xs font-normal text-slate-500">vizite</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 sm:p-8 flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6">Vizite (7 zile)</h3>
          <div className="flex-1 min-h-[260px] sm:min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData || []}>
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="visits" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 sm:p-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Globe className="text-sky-300" /> Distribuție geo (top)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data.geoData || []).map((g) => (
            <div
              key={g.name}
              className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between"
            >
              <span className="text-slate-200 font-medium">{g.name}</span>
              <span className="text-white font-bold bg-indigo-500/20 px-2 py-1 rounded text-sm">
                {g.value}
              </span>
            </div>
          ))}
          {(data.geoData || []).length === 0 && (
            <p className="text-slate-500">Încă nu sunt date.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- ROOT APP ----------------
export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [role, setRole] = useState(null);

  const [dashKey, setDashKey] = useState(0);
  const bumpDashboard = () => setDashKey((k) => k + 1);

  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = async () => {
    const n = await countPending();
    setPendingCount(n);
  };

  const onLogout = () => {
    clearToken();
    setAuthed(false);
    setRole(null);
  };

  // ✅ păstrează role-ul
  useEffect(() => {
    if (!getToken()) return;
    (async () => {
      const { res, data } = await apiFetch("/api/auth/me");
      if (!res?.ok) {
        clearToken();
        setAuthed(false);
        setRole(null);
        return;
      }
      setAuthed(true);
      setRole(data.role);
    })();
  }, []);

  // ✅ sync când revii online + init
  useEffect(() => {
    let mounted = true;

    const handleOnline = async () => {
      const result = await syncPendingShortens({
        onItemSynced: (synced) => {
          // dacă syncQueue îți dă { code } -> actualizează dashboard
          bumpDashboard();

          // opțional: dacă ai code, poți naviga direct la stats
          if (synced?.code) {
            localStorage.setItem("lastSyncedCode", synced.code);
          }
        },
        onDone: async () => {
          if (!mounted) return;
          await refreshPendingCount();
        },
      });

      // dacă syncQueue îți returnează ceva util, nu îl folosim aici ca să evităm unused-vars
      void result;
    };

    window.addEventListener("online", handleOnline);

    // init: număr cereri în coadă
    void refreshPendingCount();

    // dacă e online, încercăm sync imediat
    if (navigator.onLine) void handleOnline();

    return () => {
      mounted = false;
      window.removeEventListener("online", handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recalculăm pending când se schimbă dashboardul (după enqueue / sync)
  useEffect(() => {
    void refreshPendingCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashKey]);

  // ✅ navigare automată după ce s-a sincronizat ceva (dacă există lastSyncedCode)
  function SyncedNavigator() {
    const nav = useNavigate();
    useEffect(() => {
      const code = localStorage.getItem("lastSyncedCode");
      if (!code) return;
      localStorage.removeItem("lastSyncedCode");
      nav(`/stats/${code}`);
    }, [nav]);
    return null;
  }

  return (
    <BrowserRouter>
      <div className="relative min-h-screen flex flex-col items-center font-sans overflow-x-hidden">
        <Background />
        <Navbar authed={authed} role={role} onLogout={onLogout} />
        <SyncedNavigator />

        <Routes>
          <Route path="/login" element={<Login onAuth={setAuthed} onRole={setRole} />} />
          <Route path="/register" element={<Register onAuth={setAuthed} onRole={setRole} />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home bumpDashboard={bumpDashboard} pendingCount={pendingCount} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard refreshKey={dashKey} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/stats/:code"
            element={
              <ProtectedRoute>
                <Stats />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminRoute role={role}>
                  <AdminDashboard />
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to={authed ? "/" : "/login"} replace />} />
        </Routes>

        <footer className="text-slate-600 text-xs sm:text-sm z-10 font-medium pb-6 px-4 text-center">
          © {new Date().getFullYear()} ShortUrl Premium
        </footer>
      </div>
    </BrowserRouter>
  );
}
