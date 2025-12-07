import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Copy, ArrowRight, Link as LinkIcon, BarChart3, 
  CheckCircle, AlertTriangle, Globe, Clock, MapPin, 
  MousePointer2, Zap, ShieldCheck 
} from 'lucide-react';
import copy from 'copy-to-clipboard';
import { format } from 'date-fns';

// ✅ URL-UL TĂU DE RENDER (Verifică să fie corect!)
const API_BASE = "https://proiectdsw.onrender.com"; 

// --- COMPONENTE UI ---

const Loader = () => (
  <div className="flex justify-center p-2">
    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const Background = () => (
  <div className="fixed inset-0 z-0 overflow-hidden bg-slate-900">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"></div>
    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
    <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
  </div>
);

const Navbar = () => (
  <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
    <Link to="/" className="text-2xl font-bold text-white tracking-tighter flex items-center gap-2">
      <Zap className="text-yellow-400 fill-yellow-400" />
      Quick<span className="text-indigo-400">Link</span>
    </Link>
  </nav>
);

// --- PAGINA HOME ---

function Home() {
  const [longUrl, setLongUrl] = useState('');
  const [shortCode, setShortCode] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShortCode(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ longUrl }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setShortCode(data.shortCode);
      } else {
        setError(data.error || 'Eroare server.');
      }
    } catch (err) {
      console.error(err);
      setError("Serverul nu răspunde. Verifică Render.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    copy(`${API_BASE}/${shortCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative z-10 w-full max-w-xl px-4 flex flex-col items-center">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-lg">
          Scurtează link-uri <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            inteligent & rapid
          </span>
        </h1>
        <p className="text-slate-400 text-lg">
          Transformă URL-urile lungi în link-uri scurte, sigure și ușor de urmărit.
        </p>
      </div>

      <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl animate-fade-in">
        <form onSubmit={handleSubmit} className="relative group mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <LinkIcon size={20} />
          </div>
          <input 
            type="text" 
            className="w-full py-4 pl-12 pr-36 rounded-2xl bg-slate-900/50 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 outline-none transition-all shadow-inner"
            placeholder="Lipește link-ul lung aici..."
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
          />
          <button 
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader /> : <>Scurtează <ArrowRight size={16} /></>}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-center justify-center gap-2 mb-6">
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {shortCode && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="w-full overflow-hidden text-center sm:text-left">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Link generat:</p>
                <a href={`${API_BASE}/${shortCode}`} target="_blank" className="text-xl font-bold text-indigo-400 hover:text-indigo-300 truncate block transition">
                  {API_BASE.replace('https://', '')}/{shortCode}
                </a>
              </div>
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all w-full sm:w-auto justify-center ${copied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
              >
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                {copied ? 'Copiat' : 'Copiază'}
              </button>
            </div>

            <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
               <div className="bg-white p-2 rounded-xl">
                 <QRCodeCanvas value={`${API_BASE}/${shortCode}`} size={80} />
               </div>
               <div className="text-center sm:text-right">
                  <p className="text-slate-300 text-sm mb-3">Vrei să vezi cine a dat click?</p>
                  <Link to={`/stats/${shortCode}`} className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-semibold transition group">
                    <BarChart3 size={18} /> Statistici Detaliate 
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                  </Link>
               </div>
            </div>
          </div>
        )}
      </div>
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
    fetch(`${API_BASE}/api/stats/${code}`)
      .then(res => {
          if (!res.ok) throw new Error("Link-ul nu a fost găsit.");
          return res.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [code]);

  if (loading) return <div className="text-white z-10"><Loader /></div>;
  
  if (error) return (
      <div className="z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center text-white max-w-md">
          <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Eroare</h2>
          <p className="text-slate-400">{error}</p>
          <Link to="/" className="inline-block mt-6 text-indigo-400 hover:text-indigo-300">Înapoi la Home</Link>
      </div>
  );

  return (
    <div className="relative z-10 w-full max-w-4xl px-4 animate-fade-in">
      <Link to="/" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowRight className="rotate-180 mr-2" size={20} /> Înapoi la generare
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl"><MousePointer2 size={28}/></div>
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Click-uri Totale</p>
                <p className="text-3xl font-extrabold text-white">{data.visits}</p>
            </div>
        </div>

        <div className="md:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col justify-center">
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Destinație</p>
             <a href={data.longUrl} target="_blank" className="text-lg font-medium text-white hover:text-indigo-400 truncate transition flex items-center gap-2">
                 <LinkIcon size={16} /> {data.longUrl}
             </a>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
             <h3 className="font-bold text-white flex items-center gap-2"><Clock size={18} className="text-indigo-400"/> Istoric Trafic</h3>
             <span className="text-xs font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/20">LIVE</span>
          </div>
          
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
             <table className="w-full text-left border-collapse">
               <thead className="bg-black/20 text-slate-400 text-xs uppercase tracking-wider sticky top-0 backdrop-blur-md">
                 <tr>
                   <th className="p-4 font-semibold">IP Address</th>
                   <th className="p-4 font-semibold">Locație</th>
                   <th className="p-4 font-semibold">Data & Ora</th>
                   <th className="p-4 font-semibold">Browser / OS</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5 text-sm">
                 {data.history && data.history.length > 0 ? (
                   data.history.map((visit, index) => (
                     <tr key={index} className="hover:bg-white/5 transition duration-150">
                       <td className="p-4 font-mono text-slate-300 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> {visit.ip}
                       </td>
                       <td className="p-4 text-white">
                          <div className="flex items-center gap-2">
                             <MapPin size={14} className="text-slate-500" />
                             {visit.city !== 'Unknown' ? visit.city : ''} 
                             <span className="text-slate-400">({visit.country})</span>
                          </div>
                       </td>
                       <td className="p-4 text-slate-400">
                          {visit.date ? format(new Date(visit.date), 'dd MMM, HH:mm') : '-'}
                       </td>
                       <td className="p-4 text-slate-500 text-xs max-w-[200px] truncate" title={visit.userAgent}>
                          {visit.userAgent}
                       </td>
                     </tr>
                   ))
                 ) : (
                   <tr>
                     <td colSpan="4" className="p-10 text-center text-slate-500">
                        Niciun click înregistrat încă.
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

// --- MAIN LAYOUT (Centrare Globală) ---

export default function App() {
  return (
    <BrowserRouter>
      <div className="relative min-h-screen flex flex-col items-center justify-center font-sans selection:bg-indigo-500 selection:text-white">
        <Background />
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stats/:code" element={<Stats />} />
        </Routes>
        <footer className="absolute bottom-4 text-slate-600 text-xs z-10">
            © 2024 QuickLink Pro.
        </footer>
      </div>
    </BrowserRouter>
  );
}