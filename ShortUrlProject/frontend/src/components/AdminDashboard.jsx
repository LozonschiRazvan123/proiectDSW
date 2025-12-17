import { useEffect, useState } from "react";
import { LayoutDashboard, TrendingUp, Globe } from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

import Loader from "../components/Loader";
import { apiFetch } from "../lib/api";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/admin/dashboard")
      .then(({ res, data }) => {
        if (!res?.ok) setData({ error: data?.error || "Eroare" });
        else setData(data);
        setLoading(false);
      })
      .catch(() => {
        setData({ error: "Eroare de rețea" });
        setLoading(false);
      });
  }, []);

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
    <div className="relative z-10 w-full max-w-7xl px-4 pt-28 pb-10">
      <h1 className="text-4xl font-black text-white mb-8 flex items-center gap-2">
        <LayoutDashboard className="text-indigo-300" />
        Admin Dashboard
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-indigo-600/20 border border-indigo-500/30 p-6 sm:p-8 rounded-[2rem]">
          <p className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-2">
            Total link-uri
          </p>
          <p className="text-6xl font-black text-white">
            {data.totalLinks}
          </p>
        </div>

        <div className="bg-emerald-600/10 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem]">
          <p className="text-emerald-200 text-sm font-bold uppercase tracking-wider mb-2">
            Total vizite
          </p>
          <p className="text-6xl font-black text-white">
            {data.totalVisits}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 sm:p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="text-yellow-300" />
            Top link-uri
          </h3>

          <div className="space-y-4">
            {(data.topLinks || []).map((l) => (
              <div
                key={l.code}
                className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10"
              >
                <div className="min-w-0 pr-4">
                  <div className="text-indigo-300 font-bold text-lg">
                    /{l.code}
                  </div>
                  <div className="text-slate-500 text-xs truncate max-w-[340px]">
                    {l.longUrl}
                  </div>
                  <div className="text-slate-600 text-xs">
                    Owner: {l.owner}
                  </div>
                </div>

                <div className="text-2xl font-black text-white shrink-0">
                  {l.visits}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    vizite
                  </span>
                </div>
              </div>
            ))}

            {(data.topLinks || []).length === 0 && (
              <p className="text-slate-500">Încă nu sunt date.</p>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 sm:p-8 flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6">
            Vizite (7 zile)
          </h3>

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
                    borderRadius: 12
                  }}
                />
                <Bar dataKey="visits" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Geo */}
      <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 sm:p-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Globe className="text-sky-300" />
          Distribuție geo (top)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data.geoData || []).map((g) => (
            <div
              key={g.name}
              className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between"
            >
              <span className="text-slate-200 font-medium">
                {g.name}
              </span>
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
