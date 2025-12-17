import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import Loader from "../components/Loader";
import { apiFetch, getToken, setToken } from "../lib/api";

export default function Register({ onAuth, onRole }) {
  const nav = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [loading, setL] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (getToken()) nav("/", { replace: true }); }, [nav]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setL(true);

    const { res, data } = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    setL(false);
    if (!res?.ok) return setErr(data?.error || "Eroare register");

    setToken(data.token);
    onAuth(true);
    onRole(data.role);
    nav("/", { replace: true });
  };

  return (
    <div className="relative z-10 w-full max-w-md pt-28 px-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
        <h1 className="text-3xl font-black text-white mb-6">Register</h1>
        <form onSubmit={submit} className="space-y-4">
          <input className="w-full p-4 rounded-2xl bg-slate-950/60 border border-white/10 text-white outline-none"
            placeholder="username (min 3)" value={username} onChange={(e) => setU(e.target.value)} />
          <input className="w-full p-4 rounded-2xl bg-slate-950/60 border border-white/10 text-white outline-none"
            placeholder="password (min 6)" type="password" value={password} onChange={(e) => setP(e.target.value)} />

          {err && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-3 rounded-xl flex gap-2 items-center">
              <AlertTriangle size={18} /> {err}
            </div>
          )}

          <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl">
            {loading ? <Loader /> : "Create account"}
          </button>
        </form>

        <p className="text-slate-400 text-sm mt-4">
          Ai deja cont? <Link to="/login" className="text-indigo-300 hover:text-white">Login</Link>
        </p>
      </div>
    </div>
  );
}
