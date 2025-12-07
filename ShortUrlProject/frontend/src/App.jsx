import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, ArrowRight, Link as LinkIcon, BarChart2, CheckCircle, AlertCircle, Scissors } from 'lucide-react';
import copy from 'copy-to-clipboard';

// URL-ul Backend-ului (asigură-te că rulează pe portul 5000)
const API_BASE = "http://localhost:5000"; 

// --- Componenta de Loader (Animație de încărcare) ---
const Loader = () => (
  <div className="flex justify-center items-center py-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

// --- Pagina HOME ---
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
        setError(data.error || 'Ceva nu a mers bine.');
      }
    } catch (err) {
      // FIX: Folosim err ca să nu se plângă React/ESLint
      console.error(err); 
      setError("Serverul nu răspunde. Verifică dacă backend-ul rulează.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    copy(`${API_BASE}/${shortCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
      
      {/* Container Principal cu efect de sticlă */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl max-w-2xl w-full relative overflow-hidden">
        
        {/* Decor: Cerc luminos în spate */}
        <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-[-50px] right-[-50px] w-32 h-32 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

        <div className="relative z-10">
          <header className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-600/20 rounded-xl mb-4 text-indigo-300">
              <Scissors size={32} />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300 mb-2">
              Short Link Pro
            </h1>
            <p className="text-slate-400">Transformă link-urile lungi în unele scurte și ușor de distribuit.</p>
          </header>

          <form onSubmit={handleSubmit} className="relative mb-8">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <LinkIcon size={20} />
              </div>
              <input 
                type="text"
                className="w-full bg-slate-900/50 border border-slate-700 text-white pl-12 pr-32 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner placeholder-slate-600"
                placeholder="Lipește URL-ul lung aici (https://...)"
                value={longUrl} 
                onChange={e => setLongUrl(e.target.value)} 
              />
              <button 
                disabled={loading}
                className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 rounded-lg transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? '...' : <><span className="hidden sm:inline">Scurtează</span><ArrowRight size={16} /></>}
              </button>
            </div>
          </form>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3 animate-pulse mb-6">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}

          {shortCode && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-xl animate-fade-in-up">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="text-center sm:text-left overflow-hidden w-full">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Link-ul tău scurt</p>
                  <a 
                    href={`${API_BASE}/${shortCode}`} 
                    target="_blank" 
                    className="text-2xl font-bold text-indigo-400 hover:text-indigo-300 transition-colors truncate block"
                  >
                    {API_BASE.replace('http://', '')}/{shortCode}
                  </a>
                </div>
                <button 
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    copied ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                  {copied ? 'Copiat!' : 'Copiază'}
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="bg-white p-2 rounded-lg shadow-inner">
                  <QRCodeCanvas value={`${API_BASE}/${shortCode}`} size={120} />
                </div>
                <div className="text-center sm:text-left text-slate-800">
                  <h3 className="font-bold text-lg mb-1">Scanează cu telefonul</h3>
                  <p className="text-sm text-slate-500 mb-4">Partajează rapid acest cod QR.</p>
                  <Link 
                    to={`/stats/${shortCode}`} 
                    className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline"
                  >
                    <BarChart2 size={18} /> Vezi Statistici
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <footer className="fixed bottom-4 text-slate-500 text-sm">
        © 2024 Short Link Pro. Built with React & Node.js
      </footer>
    </div>
  );
}

// --- Pagina STATS ---
function Stats() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/stats/${code}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(console.error);
  }, [code]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100">
       <div className="max-w-md w-full">
         <Link to="/" className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
           <ArrowRight className="rotate-180 mr-2" size={20} /> Înapoi la Home
         </Link>

         {loading ? (
            <div className="text-center text-indigo-400"><Loader /></div>
         ) : data ? (
           <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
              
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <BarChart2 className="text-indigo-400" /> Statistici Link
              </h2>
              
              <div className="space-y-6">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <p className="text-slate-500 text-sm mb-1">Link Original</p>
                  <p className="text-indigo-300 break-all font-mono text-sm">{data.longUrl}</p>
                </div>

                <div className="flex items-center justify-between bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-xl border border-indigo-500/30">
                  <div>
                     <p className="text-slate-400 text-sm font-medium uppercase">Total Vizite</p>
                     <p className="text-4xl font-extrabold text-white mt-1">{data.visits}</p>
                  </div>
                  <div className="h-12 w-12 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50">
                    <ArrowRight className="-rotate-45 text-white" size={24} />
                  </div>
                </div>
              </div>
           </div>
         ) : (
           <div className="text-center text-red-400 p-6 bg-slate-800 rounded-xl">
             Link-ul nu a fost găsit.
           </div>
         )}
       </div>
    </div>
  );
}

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