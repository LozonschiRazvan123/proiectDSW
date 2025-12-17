import { Link, useNavigate } from "react-router-dom";
import { BarChart3, LayoutDashboard, LogIn, UserPlus, LogOut } from "lucide-react";

export default function Navbar({ authed, role, onLogout }) {
  const nav = useNavigate();
  const logout = () => { onLogout(); nav("/login", { replace: true }); };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-4 sm:px-6 py-4">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <Link to="/" className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 justify-center sm:justify-start">
          <span className="w-9 h-9 rounded-2xl bg-indigo-500 flex items-center justify-center">S</span>
          Short<span className="text-indigo-300">Url</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
          {authed && role === "admin" && (
            <Link to="/admin" className="text-slate-200/80 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10">
              <LayoutDashboard size={18} /> Admin
            </Link>
          )}

          {authed ? (
            <>
              <Link to="/dashboard" className="text-slate-200/80 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10">
                <BarChart3 size={18} /> Dashboard
              </Link>
              <button onClick={logout} className="text-slate-200/80 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10">
                <LogOut size={18} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-200/80 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10">
                <LogIn size={18} /> Login
              </Link>
              <Link to="/register" className="text-slate-200/80 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-indigo-600 px-4 py-2 rounded-full border border-indigo-400/30 hover:bg-indigo-500">
                <UserPlus size={18} /> Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
