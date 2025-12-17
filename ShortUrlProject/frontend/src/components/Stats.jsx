import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowRight,
  ExternalLink,
  Clock
} from "lucide-react";

import Loader from "../components/Loader";
import { apiFetch, getApiBase } from "../lib/api";

const API_BASE = getApiBase();

export default function Stats() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/stats/${code}`)
      .then(({ res, data }) => {
        if (!res?.ok) {
          setData({ error: data?.error || "Eroare la încărcarea statisticilor" });
        } else {
          setData(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setData({ error: "Eroare de rețea" });
        setLoading(false);
      });
  }, [code]);

  if (loading) {
    return (
      <div className="relative z-10 pt-28 text-white">
        <Loader />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="relative z-10 pt-28 text-white text-center text-2xl">
        {data?.error || "Eroare"}
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full max-w-6xl px-4 pt-28 pb-10">
      {/* Back */}
      <Link
        to="/"
        className="inline-flex items-center text-indigo-300 hover:text-white mb-8 transition text-lg font-medium bg-white/5 px-6 py-3 rounded-full border border-white/10"
      >
        <ArrowRight className="rotate-180 mr-3" size={22} />
        Înapoi
      </Link>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">
            Total click-uri
          </p>
          <p className="text-6xl font-black text-white mt-2">
            {data.visits}
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Owner:{" "}
            <span className="text-slate-200 font-semibold">
              {data.owner}
            </span>
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
            className="text-white text-2xl font-bold flex gap-2 items-center break-all"
          >
            <ExternalLink />
            {API_BASE.replace("https://", "").replace("http://", "")}/{code}
          </a>
        </div>
      </div>

      {/* Destination */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 mb-6">
        <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
          Destinație
        </p>
        <a
          href={data.longUrl}
          target="_blank"
          rel="noreferrer"
          className="text-white text-xl font-semibold break-all hover:text-indigo-300"
        >
          {data.longUrl}
        </a>
      </div>

      {/* History table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="text-indigo-300" />
            Istoric (ultimele 50)
          </h3>
          <span className="text-xs font-bold bg-green-500/20 text-green-300 px-3 py-1 rounded-full border border-green-500/20">
            LIVE
          </span>
        </div>

        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-black/30 text-slate-400 text-xs uppercase tracking-wider sticky top-0">
              <tr>
                <th className="p-4">IP</th>
                <th className="p-4">Țară</th>
                <th className="p-4">Oraș</th>
                <th className="p-4">Data</th>
                <th className="p-4">User-Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {(data.history || []).length ? (
                data.history.map((v, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="p-4 font-mono text-slate-200">
                      {v.ip}
                    </td>
                    <td className="p-4 text-slate-200">
                      {v.country}
                    </td>
                    <td className="p-4 text-slate-200">
                      {v.city}
                    </td>
                    <td className="p-4 text-slate-400">
                      {v.date
                        ? format(new Date(v.date), "dd MMM yyyy, HH:mm")
                        : "-"}
                    </td>
                    <td
                      className="p-4 text-slate-500 max-w-[320px] truncate"
                      title={v.userAgent}
                    >
                      {v.userAgent}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="p-10 text-center text-slate-400"
                    colSpan={5}
                  >
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
