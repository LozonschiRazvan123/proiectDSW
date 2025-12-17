import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

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

import { apiFetch, clearToken, getToken } from "./lib/api";
import { countPending } from "./lib/offlineQueue";
import { syncPendingShortens } from "./lib/syncQueue";

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [role, setRole] = useState(null);

  const [dashKey, setDashKey] = useState(0);
  const bumpDashboard = () => setDashKey((k) => k + 1);

  const [pendingCount, setPendingCount] = useState(0);
  const refreshPendingCount = async () => setPendingCount(await countPending());

  const onLogout = () => {
    clearToken();
    setAuthed(false);
    setRole(null);
  };

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
    refreshPendingCount();
    if (navigator.onLine) handleOnline();

    return () => window.removeEventListener("online", handleOnline);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    apiFetch("/api/auth/me").then(({ res, data }) => {
      if (!res?.ok) { clearToken(); setAuthed(false); setRole(null); return; }
      setAuthed(true);
      setRole(data.role);
    });
  }, []);

  useEffect(() => { refreshPendingCount(); }, [dashKey]);

  return (
    <BrowserRouter>
      <div className="relative min-h-screen flex flex-col items-center font-sans overflow-x-hidden">
        <Background />
        <Navbar authed={authed} role={role} onLogout={onLogout} />
        <SyncedNavigator />

        <Routes>
          <Route path="/login" element={<Login onAuth={setAuthed} onRole={setRole} />} />
          <Route path="/register" element={<Register onAuth={setAuthed} onRole={setRole} />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Home bumpDashboard={bumpDashboard} pendingCount={pendingCount} />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard refreshKey={dashKey} /></ProtectedRoute>} />
          <Route path="/stats/:code" element={<ProtectedRoute><Stats /></ProtectedRoute>} />

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

