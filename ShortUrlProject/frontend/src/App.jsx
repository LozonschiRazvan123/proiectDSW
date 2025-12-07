import { useState, useEffect } from 'react';
// FIX 1: Am scos 'useLocation' de aici pentru că nu îl folosim
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Copy, ArrowRight, Link as LinkIcon, BarChart3, 
  CheckCircle, AlertTriangle, Globe, Clock, MapPin 
} from 'lucide-react';
import copy from 'copy-to-clipboard';
import { format } from 'date-fns';

const API_BASE = "http://localhost:5000"; 

// --- Loader Component ---
const Loader = () => (
  <div className="flex justify-center p-4">
    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// --- Componenta HOME ---
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
        setError(data.error || 'Eroare la server.');
      }
    } catch (err) {
      // FIX 2: Folosim variabila 'err' afișând-o în consolă
      console.error("Eroare detaliată:", err);
      setError("Nu s-a putut conecta la server.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    copy(`${API_BASE}/${shortCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Background Shapes */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300 opacity-20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>

      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 md:p-12 rounded-3xl shadow-2xl max-w-2xl w-full z-10 text-center">
        
        <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 drop-shadow-md">
              Short<span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">Url</span>
            </h1>
            <p className="text-indigo-100 text-lg">Platformă avansată de scurtare link-uri</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-indigo-300">
            <LinkIcon size={20} />
          </div>
          <input 
            type="text" 
            className="w-full py-4 pl-12 pr-36 rounded-full bg-white/90 border-2 border-transparent focus:border-yellow-400 focus:ring-0 text-slate-800 placeholder-slate-400 outline-none transition-all shadow-lg text-lg"
            placeholder="Lipește link-ul lung aici..."
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
          />
          <button 
            disabled={loading}
            className="absolute right-1.5 top-1.5 bottom-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-full transition-all shadow-md flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader /> : <>Scurtează <ArrowRight size={18} /></>}
          </button>
        </form>

        {error && (
          <div className="mt-6 bg-red-500/80 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 backdrop-blur-sm shadow-lg animate-bounce">
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        {shortCode && (
          <div className="mt-8 bg-white/20 border border-white/30 rounded-2xl p-6 text-left animate-fade-in-up shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="overflow-hidden w-full">
                <p className="text-xs text-indigo-200 uppercase font-bold tracking-widest mb-1">Link-ul tău scurt</p>
                <a href={`${API_BASE}/${shortCode}`} target="_blank" className="text-2xl font-bold text-white hover:text-yellow-300 transition truncate block">
                  {API_BASE.replace('http://', '')}/{shortCode}
                </a>
              </div>
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg ${copied ? 'bg-green-500 text-white' : 'bg-white text-indigo-900 hover:bg-gray-100'}`}
              >
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                {copied ? 'Copiat!' : 'Copiază'}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-6">
               <div className="bg-white p-2 rounded-xl shadow-inner">
                 <QRCodeCanvas value={`${API_BASE}/${shortCode}`} size={100} />
               </div>
               <div className="text-center sm:text-right">
                  <p className="text-white font-medium mb-3">Vrei să vezi cine a dat click?</p>
                  <Link to={`/stats/${shortCode}`} className="inline-flex items-center gap-2 bg-indigo-900/50 hover:bg-indigo-900 text-white px-5 py-2.5 rounded-xl transition border border-indigo-400/30">
                    <BarChart3 size={18} /> Vezi Statistici & IP-uri
                  </Link>
               </div>
            </div>
          </div>
        )}
      </div>
      <p className="absolute bottom-4 text-white/50 text-sm">© 2024 ShortUrl Premium</p>
    </div>
  );
}

// --- Componenta STATS ---
function Stats() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/stats/${code}`)
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(console.error);
  }, [code]);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><Loader /></div>;
  if (!data || data.error) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Nu există statistici pentru acest link.</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4 font-sans">
      <div className="w-full max-w-5xl">
        <Link to="/" className="inline-flex items-center text-slate-500 hover:text-indigo-600 mb-8 font-medium transition">
          <ArrowRight className="rotate-180 mr-2" size={20} /> Înapoi la generare
        </Link>

        {/* HEADER STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
               <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Globe size={24} /></div>
               <div>
                  <p className="text-slate-500 text-sm font-bold uppercase">Total Click-uri</p>
                  <p className="text-3xl font-extrabold text-slate-800">{data.visits}</p>
               </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-2 overflow-hidden">
               <p className="text-slate-500 text-sm font-bold uppercase mb-1">Link Original</p>
               <a href={data.longUrl} target="_blank" className="text-indigo-600 font-medium hover:underline truncate block text-lg">{data.longUrl}</a>
            </div>
        </div>

        {/* TABEL DETALIAT (CHALLENGE) */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <Clock size={20} className="text-indigo-500" /> Istoric Vizite Recente
              </h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full font-bold">LIVE DATA</span>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                   <th className="p-4 font-semibold border-b">IP Address</th>
                   <th className="p-4 font-semibold border-b">Locație (Țară/Oraș)</th>
                   <th className="p-4 font-semibold border-b">Data & Ora</th>
                   <th className="p-4 font-semibold border-b">Dispozitiv</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {data.history && data.history.length > 0 ? (
                   data.history.map((visit, index) => (
                     <tr key={index} className="hover:bg-indigo-50/30 transition">
                       <td className="p-4 font-mono text-slate-600 text-sm flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div> {visit.ip}
                       </td>
                       <td className="p-4 text-slate-700 font-medium">
                          <div className="flex items-center gap-2">
                             <MapPin size={16} className="text-slate-400" />
                             {visit.city !== 'Unknown' ? `${visit.city}, ` : ''} {visit.country}
                          </div>
                       </td>
                       <td className="p-4 text-slate-500 text-sm">
                          {format(new Date(visit.date), 'dd MMM yyyy, HH:mm')}
                       </td>
                       <td className="p-4 text-xs text-slate-400 max-w-xs truncate" title={visit.userAgent}>
                          {visit.userAgent ? visit.userAgent.substring(0, 50) + '...' : 'Unknown'}
                       </td>
                     </tr>
                   ))
                 ) : (
                   <tr>
                     <td colSpan="4" className="p-8 text-center text-slate-400">
                        Încă nu sunt vizite înregistrate pentru acest link.
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

      </div>
    </div>
  );
}

// --- Ruter Principal ---
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stats/:code" element={<Stats />} />
      </Routes>
    </BrowserRouter>
  );
}