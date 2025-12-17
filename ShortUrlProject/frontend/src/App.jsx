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
    const handleOnline = async () => {
      await syncPendingShortens({
        onItemSynced: () => bumpDashboard(),
        onDone: () => refreshPendingCount(),
      });
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

          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminRoute role={role}>
                <AdminDashboard />
              </AdminRoute>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to={authed ? "/" : "/login"} replace />} />
        </Routes>

        <footer className="text-slate-600 text-sm z-10 font-medium pb-6">
          © {new Date().getFullYear()} ShortUrl Premium
        </footer>
      </div>
    </BrowserRouter>
  );
}

