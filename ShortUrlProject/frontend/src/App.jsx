import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Import componente
import Background from "./components/Background";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./components/Home";
import Dashboard from "./components/Dashboard";
import Stats from "./components/Stats";
import AdminDashboard from "./components/AdminDashboard";

// Import librării
import { apiFetch, clearToken, getToken } from "./lib/api";
import { countPending } from "./lib/offlineQueue";
import { syncPendingShortens } from "./lib/syncQueue";

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [role, setRole] = useState(null);

  // Semnal pentru Dashboard să reîncarce lista
  const [dashKey, setDashKey] = useState(0);
  const bumpDashboard = () => setDashKey((k) => k + 1);

  // Contorul pentru bulina roșie de la Home
  const [pendingCount, setPendingCount] = useState(0);
  const refreshPendingCount = async () => setPendingCount(await countPending());

  const onLogout = () => {
    clearToken();
    setAuthed(false);
    setRole(null);
  };

  // ✅ Sincronizare și Inițializare
  useEffect(() => {
    // Funcția care rulează când revine internetul
    const handleOnline = async () => {
      console.log("🟢 Back online! Syncing...");
      
      await syncPendingShortens({
        // Am scos 'remaining' de aici pentru a scăpa de eroare
        onDone: ({ syncedAny }) => {
          if (syncedAny) {
            bumpDashboard(); // Dacă s-a sincronizat ceva, refresh la dashboard
          }
          refreshPendingCount(); // Recalculăm câte au mai rămas (ar trebui 0)
        },
      });
    };

    window.addEventListener("online", handleOnline);

    // ✅ FIX: Folosim o funcție async internă pentru a evita eroarea "setState in effect"
    const init = async () => {
      await refreshPendingCount(); // Vedem dacă avem ceva în coadă la start
      if (navigator.onLine) {
        await handleOnline(); // Încercăm sync dacă avem net
      }
    };
    init();

    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // Auth check standard
  useEffect(() => {
    if (!getToken()) return;
    apiFetch("/api/auth/me").then(({ res, data }) => {
      if (!res?.ok) { clearToken(); setAuthed(false); setRole(null); return; }
      setAuthed(true);
      setRole(data.role);
    });
  }, []);

  // Update pending count la schimbări de dashboard
  //useEffect(() => { refreshPendingCount(); }, [dashKey]);

  return (
    <BrowserRouter>
      {/* Container principal */}
      <div className="relative min-h-screen flex flex-col items-center font-sans overflow-x-hidden text-slate-200">
        <Background />
        <Navbar authed={authed} role={role} onLogout={onLogout} />

        <Routes>
          <Route path="/login" element={<Login onAuth={setAuthed} onRole={setRole} />} />
          <Route path="/register" element={<Register onAuth={setAuthed} onRole={setRole} />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Home 
                bumpDashboard={bumpDashboard} 
                pendingCount={pendingCount}
                refreshPendingCount={refreshPendingCount}
              />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard refreshKey={dashKey} />
            </ProtectedRoute>
          } />
          
          <Route path="/stats/:code" element={<ProtectedRoute><Stats /></ProtectedRoute>} />

          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminRoute role={role}>
                <AdminDashboard />
              </AdminRoute>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to={authed ? "/" : "/login"} replace />} />
        </Routes>

        <footer className="text-slate-500 text-sm z-10 font-medium pb-6 mt-auto">
          © {new Date().getFullYear()} ShortUrl Premium
        </footer>
      </div>
    </BrowserRouter>
  );
}