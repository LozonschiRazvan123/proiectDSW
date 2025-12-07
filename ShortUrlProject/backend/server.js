// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';
import validator from 'validator';
import axios from 'axios'; // Folosit pentru Geo-Location

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
// Trust proxy este necesar dacă ești în spatele unui load balancer (ca la deploy) pentru a vedea IP-ul real
app.set('trust proxy', true);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// --- RUTA 1: SCURTARE URL ---
app.post('/api/shorten', async (req, res) => {
  try {
    const { longUrl } = req.body;

    if (!validator.isURL(longUrl, { require_protocol: true })) {
      return res.status(400).json({ error: "URL invalid! Te rugăm să incluzi http:// sau https://" });
    }

    // Verificare duplicate
    const existingCode = await redis.get(`url:${longUrl}`);
    if (existingCode) {
      return res.json({ shortCode: existingCode, msg: "Acest link exista deja în baza noastră." });
    }

    const shortCode = nanoid(6);

    // Salvăm datele
    await redis.set(`short:${shortCode}`, longUrl);
    await redis.set(`url:${longUrl}`, shortCode);
    await redis.set(`stats:${shortCode}`, 0); // Contor simplu

    res.json({ shortCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTA 2: STATISTICI AVANSATE (CHALLENGE) ---
app.get('/api/stats/:code', async (req, res) => {
  const { code } = req.params;
  
  const longUrl = await redis.get(`short:${code}`);
  if (!longUrl) return res.status(404).json({ error: "Nu a fost găsit" });

  const totalVisits = await redis.get(`stats:${code}`);
  
  // Citim lista de istoric (ultimele 50 de vizite)
  // Redis List: 'history:cod'
  const historyRaw = await redis.lrange(`history:${code}`, 0, 49);
  const history = historyRaw.map(item => JSON.parse(item));

  res.json({ 
    longUrl, 
    visits: totalVisits || 0,
    history: history || [] 
  });
});

// --- RUTA 3: REDIRECTARE + TRACKING ---
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  const longUrl = await redis.get(`short:${code}`);

  if (longUrl) {
    // 1. Incrementăm contorul
    await redis.incr(`stats:${code}`);

    // 2. Tracking avansat (IP & Location)
    // Luăm IP-ul utilizatorului
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    if (ip.includes(',')) ip = ip.split(',')[0].trim(); // Uneori sunt mai multe IP-uri

    // Încercăm să aflăm țara (Folosim un API public gratuit pentru demo - ipapi.co)
    let country = "Unknown";
    let city = "Unknown";
    
    try {
        // Notă: În producție, folosește ipstack cu API Key cum cere PDF-ul.
        // Aici folosim ipapi.co pentru a merge "out of the box" fără cheie.
        if(ip !== '127.0.0.1' && ip !== '::1') {
            const geoRes = await axios.get(`https://ipapi.co/${ip}/json/`);
            if(geoRes.data && !geoRes.data.error) {
                country = geoRes.data.country_name;
                city = geoRes.data.city;
            }
        } else {
            country = "Localhost";
        }
    } catch (e) {
        console.error("GeoIP Error:", e.message);
    }

    // Creăm obiectul vizitei
    const visitData = {
        date: new Date().toISOString(),
        ip: ip,
        country: country,
        city: city,
        userAgent: req.get('User-Agent')
    };

    // Salvăm în lista de istoric (LPUSH adaugă la începutul listei)
    await redis.lpush(`history:${code}`, JSON.stringify(visitData));

    // Redirect
    res.redirect(longUrl);
  } else {
    res.status(404).send(`
      <div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#f3f4f6;">
        <h1 style="color:#ef4444;">404 - Link Expirat sau Inexistent</h1>
      </div>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});