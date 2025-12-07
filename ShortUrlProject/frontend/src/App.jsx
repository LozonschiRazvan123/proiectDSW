import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Copy, ArrowRight, Link as LinkIcon, BarChart3, 
  CheckCircle, AlertTriangle, Clock, MapPin, 
  MousePointer2, Zap, Trash2, ExternalLink, Info,
  LayoutDashboard, TrendingUp, Globe 
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import copy from 'copy-to-clipboard';
import { format } from 'date-fns';

const API_BASE = "https://proiectdsw.onrender.com"; 

// --- UTILITARE ---
const Loader = () => (
  <div className="flex justify-center p-2">
    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const Background = () => (
  <div className="fixed inset-0 z-0 overflow-hidden bg-slate-900">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"></div>
    <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
    <div className="absolute top-0 -right-4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-4000"></div>
  </div>
);

const Navbar = () => (
  <nav className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50 pointer-events-none">
    {/* pointer-events-none pe container, dar auto pe butoane ca sa nu blocheze click-urile dedesubt */}
    <Link to="/" className="text-3xl font-extrabold text-white tracking-tighter flex items-center gap-3 pointer-events-auto">
      <Zap className="text-yellow-400 fill-yellow-400" size={32} />
      {/* 👇 AICI AM MODIFICAT NUMELE 👇 */}
      Feaa<span className="text-indigo-400">Link</span>
    </Link>
    <Link to="/admin" className="text-slate-400 hover:text-white transition flex items-center gap-2 text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 pointer-events-auto">
       <LayoutDashboard size={18}/> Admin
    </Link>
  </nav>
);

// --- PAGINA HOME ---
function Home() {
  const [longUrl, setLongUrl] = useState(() => sessionStorage.getItem('lastLongUrl') || '');
  const [shortCode, setShortCode] = useState(() => sessionStorage.getItem('lastShortCode') || null);
  const [infoMsg, setInfoMsg] = useState(() => sessionStorage.getItem('lastInfoMsg') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setInfoMsg(''); setShortCode(null); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/shorten`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ longUrl }) });
      const data = await res.json();
      if (res.ok) {
        setShortCode(data.shortCode);
        sessionStorage.setItem('lastShortCode', data.shortCode);
        sessionStorage.setItem('lastLongUrl', longUrl);
        if (data.existing) { setInfoMsg(data.msg); sessionStorage.setItem('lastInfoMsg', data.msg); } 
        else { sessionStorage.removeItem('lastInfoMsg'); }
      } else { setError(data.error || 'Eroare server.'); }
    } catch (err) { console.error(err); setError("Serverul nu răspunde. Verifică Render."); }
    setLoading(false);
  };

  const handleReset = () => { setLongUrl(''); setShortCode(null); setInfoMsg(''); sessionStorage.clear(); };
  const handleCopy = () => { copy(`${API_BASE}/${shortCode}`); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center animate-fade-in pt-32">
      {!shortCode ? (
        <>
          <div className="text-center mb-12">
            <h1 className="text-6xl md:text-7xl font-black text-white mb-6 tracking-tight drop-shadow-2xl">
              Scurtează <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">GIGANTIC</span>
            </h1>
            <p className="text-slate-300 text-2xl font-light">Cel mai simplu mod de a gestiona link-uri lungi.</p>
          </div>
          <div className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-400"><LinkIcon size={32} /></div>
              <input type="text" className="w-full py-8 pl-20 pr-48 rounded-3xl bg-slate-900/60 border-2 border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-white placeholder-slate-500 outline-none transition-all shadow-inner text-2xl" placeholder="Lipește link-ul aici..." value={longUrl} onChange={(e) => setLongUrl(e.target.value)}/>
              <button disabled={loading} className="absolute right-3 top-3 bottom-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 rounded-2xl transition-all shadow-lg flex items-center gap-3 disabled:opacity-50 text-xl">
                {loading ? <Loader /> : <>SCURTEAZĂ <ArrowRight size={24} /></>}
              </button>
            </form>
            {error && <div className="mt-6 bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-2xl flex items-center justify-center gap-3 text-lg"><AlertTriangle size={24} /> {error}</div>}
          </div>
        </>
      ) : (
        <div className="w-full bg-slate-800/80 backdrop-blur-2xl border border-indigo-500/30 p-12 rounded-[3rem] shadow-[0_0_50px_-12px_rgba(99,102,241,0.5)]">
          <div className="flex justify-between items-start mb-8">
            <div><h2 className="text-3xl font-bold text-white mb-2">Link-ul tău este gata! 🚀</h2><p className="text-slate-400 text-lg break-all max-w-2xl">{longUrl}</p></div>
            <button onClick={handleReset} className="text-slate-400 hover:text-white flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/10 transition"><Trash2 size={20}/> Resetează</button>
          </div>
          {infoMsg && <div className="mb-8 bg-blue-500/20 border border-blue-500/30 text-blue-100 p-5 rounded-2xl flex items-center gap-4 text-xl font-medium animate-pulse"><Info size={32} className="text-blue-400 flex-shrink-0" />{infoMsg}</div>}
          <div className="bg-slate-900/50 rounded-3xl p-8 border border-white/10 flex flex-col md:flex-row items-center gap-8 mb-8">
            <div className="flex-1 w-full"><p className="text-sm text-indigo-300 font-bold uppercase tracking-widest mb-3">Link Scurt Generat</p><a href={`${API_BASE}/${shortCode}`} target="_blank" className="text-4xl md:text-5xl font-black text-white hover:text-indigo-400 transition break-all leading-tight">{API_BASE.replace('https://', '')}/{shortCode}</a></div>
            <button onClick={handleCopy} className={`flex-shrink-0 flex items-center gap-3 px-8 py-6 rounded-2xl font-bold text-xl transition-all shadow-xl transform hover:scale-105 active:scale-95 ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>{copied ? <CheckCircle size={28} /> : <Copy size={28} />}{copied ? 'COPIAT!' : 'COPIAZĂ'}</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-white p-6 rounded-3xl flex justify-center items-center shadow-lg transform hover:scale-[1.02] transition"><QRCodeCanvas value={`${API_BASE}/${shortCode}`} size={200} /></div>
             <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-3xl border border-indigo-500/30 flex flex-col justify-center items-center text-center shadow-lg group">
                <BarChart3 size={64} className="text-indigo-400 mb-4 group-hover:scale-110 transition-transform duration-300"/>
                <h3 className="text-2xl font-bold text-white mb-2">Vezi Statistici & Locație</h3>
                <p className="text-slate-400 mb-6">Află cine a dat click și de unde.</p>
                <Link to={`/stats/${shortCode}`} className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-bold text-lg hover:bg-indigo-50 transition w-full">Deschide Raport</Link>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- PAGINA STATS ---
function Stats() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/stats/${code}`).then(res => res.ok ? res.json() : Promise.reject("Eroare")).then(d => { setData(d); setLoading(false); }).catch((err) => { console.error(err); setError("Link inexistent."); setLoading(false); });
  }, [code]);

  if (loading) return <div className="text-white z-10"><Loader /></div>;
  if (error) return <div className="z-10 text-white text-center text-2xl">{error}</div>;

  return (
    // FIX AICI: Am adaugat 'pt-32' ca să împingem conținutul sub meniu
    <div className="relative z-10 w-full max-w-6xl px-4 animate-fade-in pt-32 pb-10">
      <Link to="/" className="inline-flex items-center text-indigo-300 hover:text-white mb-8 transition-colors text-lg font-medium bg-white/5 px-6 py-3 rounded-full border border-white/10 relative z-30">
        <ArrowRight className="rotate-180 mr-3" size={24} /> Înapoi la link-ul meu
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-[2rem] flex items-center gap-6 shadow-xl">
            <div className="p-5 bg-indigo-500 text-white rounded-3xl shadow-lg shadow-indigo-500/30"><MousePointer2 size={40}/></div>
            <div><p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Click-uri Totale</p><p className="text-6xl font-black text-white">{data.visits}</p></div>
        </div>
        <div className="bg-indigo-600/20 backdrop-blur-md border border-indigo-500/30 p-8 rounded-[2rem] flex flex-col justify-center shadow-xl">
             <p className="text-indigo-300 text-sm font-bold uppercase tracking-wider mb-2">Link Scurt Generat</p>
             <a href={`${API_BASE}/${code}`} target="_blank" className="text-3xl font-bold text-white hover:text-indigo-400 truncate transition flex items-center gap-3"><ExternalLink size={32} /> {API_BASE.replace('https://', '')}/{code}</a>
        </div>
      </div>
      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-[2rem] flex flex-col justify-center shadow-xl mb-8">
           <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Destinație Originală</p>
           <a href={data.longUrl} target="_blank" className="text-2xl font-bold text-white hover:text-indigo-400 truncate transition flex items-center gap-3"><LinkIcon size={28} /> {data.longUrl}</a>
      </div>
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5"><h3 className="text-2xl font-bold text-white flex items-center gap-3"><Clock size={28} className="text-indigo-400"/> Istoric Trafic Detaliat</h3><span className="text-sm font-bold bg-green-500/20 text-green-400 px-4 py-2 rounded-xl border border-green-500/20">LIVE UPDATE</span></div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
             <table className="w-full text-left border-collapse">
               <thead className="bg-black/30 text-slate-400 text-sm uppercase tracking-wider sticky top-0 backdrop-blur-md">
                 <tr><th className="p-6 font-bold">IP Address</th><th className="p-6 font-bold">Locație</th><th className="p-6 font-bold">Data & Ora</th><th className="p-6 font-bold">Browser / OS</th></tr>
               </thead>
               <tbody className="divide-y divide-white/5 text-base">
                 {data.history && data.history.length > 0 ? (
                   data.history.map((visit, index) => (
                     <tr key={index} className="hover:bg-white/5 transition duration-150 group">
                       <td className="p-6 font-mono text-slate-300 flex items-center gap-3"><div className="w-2.5 h-2.5 bg-indigo-500 rounded-full group-hover:scale-125 transition"></div> {visit.ip}</td>
                       <td className="p-6 text-white font-medium"><div className="flex items-center gap-3"><MapPin size={20} className="text-indigo-400" />{visit.city || 'Unknown'} <span className="text-slate-500">({visit.country})</span></div></td>
                       <td className="p-6 text-slate-400">{visit.date ? format(new Date(visit.date), 'dd MMM yyyy, HH:mm') : '-'}</td>
                       <td className="p-6 text-slate-500 max-w-[300px] truncate">{visit.userAgent}</td>
                     </tr>
                   ))
                 ) : ( <tr><td colSpan="4" className="p-16 text-center text-slate-500 text-xl">Niciun click înregistrat încă.</td></tr> )}
               </tbody>
             </table>
          </div>
      </div>
    </div>
  );
}

// --- ADMIN DASHBOARD ---
function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/dashboard`).then(res => res.json()).then(d => { setData(d); setLoading(false); }).catch(err => console.error(err));
  }, []);

  if (loading) return <div className="text-white z-10"><Loader /></div>;

  return (
    // FIX AICI: Am adaugat 'pt-32' și aici
    <div className="relative z-10 w-full max-w-7xl px-6 animate-fade-in pt-32 pb-10">
      <Link to="/" className="inline-flex items-center text-indigo-300 hover:text-white mb-8 transition-colors text-lg font-medium bg-white/5 px-6 py-3 rounded-full border border-white/10 relative z-30">
        <ArrowRight className="rotate-180 mr-3" size={24} /> Înapoi acasă
      </Link>
      
      <h1 className="text-4xl font-black text-white mb-8 flex items-center gap-3"><LayoutDashboard size={40} className="text-indigo-400"/> Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-indigo-600/20 border border-indigo-500/30 p-8 rounded-[2rem] flex flex-col justify-center">
           <p className="text-indigo-300 text-sm font-bold uppercase tracking-wider mb-2">Total Link-uri Create</p>
           <p className="text-6xl font-black text-white">{data.totalLinks}</p>
        </div>
        <div className="bg-emerald-600/10 border border-emerald-500/30 p-8 rounded-[2rem] flex flex-col justify-center">
           <p className="text-emerald-300 text-sm font-bold uppercase tracking-wider mb-2">Total Vizite Platformă</p>
           <p className="text-6xl font-black text-white">{data.totalVisits}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8">
           <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><TrendingUp className="text-yellow-400"/> Cele mai accesate link-uri</h3>
           <div className="space-y-4">
             {data.topLinks.map((link) => (
               <div key={link.code} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                 <div className="truncate pr-4"><div className="text-indigo-400 font-bold text-lg mb-1">/{link.code}</div><div className="text-slate-500 text-xs truncate max-w-[200px]">{link.longUrl}</div></div>
                 <div className="text-2xl font-black text-white">{link.visits} <span className="text-xs font-normal text-slate-500">vizite</span></div>
               </div>
             ))}
           </div>
        </div>
        <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8 flex flex-col">
           <h3 className="text-xl font-bold text-white mb-6">Vizite (7 zile)</h3>
           <div className="flex-1 min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={data.chartData}>
                 <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                 <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff'}} />
                 <Bar dataKey="visits" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8">
         <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Globe className="text-blue-400"/> Top Țări</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.geoData.map((geo) => (
              <div key={geo.name} className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                 <span className="text-slate-300 font-medium">{geo.name}</span>
                 <span className="text-white font-bold bg-indigo-500/20 px-2 py-1 rounded text-sm">{geo.value} vizite</span>
              </div>
            ))}
            {data.geoData.length === 0 && <p className="text-slate-500">Încă nu sunt date geografice.</p>}
         </div>
      </div>
    </div>
  );
}

// --- APP ROOT ---
export default function App() {
  return (
    <BrowserRouter>
      <div className="relative min-h-screen flex flex-col items-center justify-center font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
        <Background />
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stats/:code" element={<Stats />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
        <footer className="absolute bottom-6 text-slate-600 text-sm z-10 font-medium">© 2025 Feaa Link Pro.</footer>
      </div>
    </BrowserRouter>
  );
}