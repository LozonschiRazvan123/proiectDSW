import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';
import validator from 'validator';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
// Critic pentru Render ca să vadă IP-ul real al utilizatorului
app.set('trust proxy', true);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Ruta de sănătate (Health Check)
app.get('/', (req, res) => {
  res.send('✅ Backend ONLINE. Folosește Frontend-ul.');
});

// --- RUTA 1: SCURTARE URL ---
app.post('/api/shorten', async (req, res) => {
  try {
    const { longUrl } = req.body;

    // 1. VALIDARE STRICTĂ
    // Nu acceptăm "salut", "google.com" (fără http) sau alte texte dubioase
    const isValid = validator.isURL(longUrl, {
      require_protocol: true,       // Trebuie să aibă http:// sau https://
      require_valid_protocol: true,
      protocols: ['http', 'https'],
      require_host: true,           // Trebuie să aibă domeniu
      require_tld: true,            // Trebuie să aibă extensie (.com, .ro etc)
    });

    if (!isValid) {
      return res.status(400).json({ 
        error: "URL invalid! Te rugăm să incluzi http:// sau https://" 
      });
    }

    // 2. VERIFICARE DUPLICATE
    // Dacă link-ul există deja, returnăm codul vechi
    const existingCode = await redis.get(`url:${longUrl}`);
    if (existingCode) {
      return res.json({ shortCode: existingCode, msg: "Link existent." });
    }

    // 3. GENERARE & SALVARE
    const shortCode = nanoid(6); // Generează ID de 6 caractere
    
    await redis.set(`short:${shortCode}`, longUrl);
    await redis.set(`url:${longUrl}`, shortCode);
    await redis.set(`stats:${shortCode}`, 0);

    res.json({ shortCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Eroare internă." });
  }
});

// --- RUTA 2: STATISTICI (Sigură la erori de parsing) ---
app.get('/api/stats/:code', async (req, res) => {
  const { code } = req.params;
  
  try {
    const longUrl = await redis.get(`short:${code}`);
    if (!longUrl) return res.status(404).json({ error: "Link inexistent" });

    const visits = await redis.get(`stats:${code}`);
    
    // Luăm istoricul brut (text)
    const historyRaw = await redis.lrange(`history:${code}`, 0, 49);
    
    // Transformăm sigur textul în obiecte JSON
    const history = Array.isArray(historyRaw) 
      ? historyRaw.map(item => {
          if (typeof item === 'object' && item !== null) return item;
          try { return JSON.parse(item); } catch (e) { return null; }
        }).filter(Boolean)
      : [];

    res.json({ longUrl, visits: visits || 0, history });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Eroare la citirea datelor." });
  }
});

// --- RUTA 3: REDIRECTARE + TRACKING ---
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  const longUrl = await redis.get(`short:${code}`);

  if (longUrl) {
    // 1. Incrementăm contorul
    await redis.incr(`stats:${code}`);

    // 2. Colectăm date despre vizitator
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();

    let country = "Unknown";
    let city = "Unknown";

    // Încercăm să aflăm locația (doar dacă nu e localhost)
    if (ip !== '127.0.0.1' && ip !== '::1' && ip !== 'Unknown') {
        try {
            const geoRes = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 1500 });
            if (!geoRes.data.error) {
                country = geoRes.data.country_name || "Unknown";
                city = geoRes.data.city || "Unknown";
            }
        } catch (e) { console.log("GeoIP Error (API probabil ocupat)"); }
    }

    const visitData = {
        date: new Date().toISOString(),
        ip: ip,
        country: country,
        city: city,
        userAgent: req.get('User-Agent') || "Unknown"
    };

    // Salvăm în lista de istoric
    await redis.lpush(`history:${code}`, JSON.stringify(visitData));
    
    // 3. Redirectăm utilizatorul
    res.redirect(longUrl);
  } else {
    res.status(404).send("Link expirat sau invalid.");
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));