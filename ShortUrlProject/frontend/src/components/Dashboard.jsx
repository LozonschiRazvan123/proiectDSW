import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BarChart3,
  ExternalLink,
  Pencil,
  Trash2,
  AlertTriangle
} from "lucide-react";

import Loader from "../components/Loader";
import { apiFetch, getApiBase } from "../lib/api";

const API_BASE = getApiBase();

export default function Dashboard({ refreshKey }) {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(null);
  const [newUrl, setNewUrl] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);

    const { res, data } = await apiFetch("/api/user/links");
    setLoading(false);

    if (!res?.ok) {
      if (res?.status === 401) {
        setError("Neautorizat.");
        nav("/login");
        return;
      }
      setError(data?.error || "Eroare la încărcarea link-urilor");
      return;
    }

    setItems(data.items || []);
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const del = async (code) => {
    if (!confirm(`Ștergi /${code}?`)) return;

    const { res, data } = await apiFetch(`/api/user/links/${code}`, {
      method: "DELETE"
    });

    if (!res?.ok) {
      alert(data?.error || "Eroare la ștergere");
      return;
    }

    load();
  };

  const startEdit = (item) => {
    setEditing(item.code);
    setNewUrl(item.longUrl);
  };

  const saveEdit = async () => {
    const code = editing;

    const { res, data } = await apiFetch(`/api/user/links/${code}`, {
      method: "PUT",
      body: JSON.stringify({ longUrl: newUrl })
    });

    if (!res?.ok) {
      alert(data?.error || "Eroare update");
      return;
    }

    setEditing(null);
    setNewUrl("");
    load();
  };

  if (loading) {
    return (
      <div className="relative z-10 pt-28 text-white">
        <Loader />
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full max-w-6xl px-4 pt-28 pb-10">
      <h1 className="text-4xl font-black text-white mb-6 flex items-center gap-2">
        <BarChart3 className="text-indigo-300" />
        Dashboard (link-urile tale)
      </h1>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-2xl flex items-center gap-2 mb-6">
          <AlertTriangle />
          {error}
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
        {items.length === 0 ? (
          <p className="text-slate-300">
            Nu ai link-uri încă. Creează unul pe Home.
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((it) => (
              <div
                key={it.code}
                className="bg-slate-950/40 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-white font-black text-2xl">
                    /{it.code}
                  </div>
                  <div className="text-slate-400 text-sm break-all">
                    {it.longUrl}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">
                    Visits:{" "}
                    <span className="text-slate-200 font-bold">
                      {it.visits}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`${API_BASE}/${it.code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-white flex items-center gap-2"
                  >
                    <ExternalLink size={18} />
                    Open
                  </a>

                  <Link
                    to={`/stats/${it.code}`}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-white flex items-center gap-2"
                  >
                    <BarChart3 size={18} />
                    Stats
                  </Link>

                  <button
                    onClick={() => startEdit(it)}
                    className="px-4 py-2 rounded-xl bg-indigo-600/70 hover:bg-indigo-600 text-white flex items-center gap-2"
                  >
                    <Pencil size={18} />
                    Edit
                  </button>

                  <button
                    onClick={() => del(it.code)}
                    className="px-4 py-2 rounded-xl bg-red-600/50 hover:bg-red-600 text-white flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-6 bg-indigo-600/15 border border-indigo-500/30 rounded-[2rem] p-6">
          <h2 className="text-white font-bold text-xl mb-3">
            Edit /{editing}
          </h2>

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
