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

// Configurare CORS (Permite frontend-ului să vorbească cu serverul)
app.use(cors());
app.use(express.json());
app.set('trust proxy', true); // Critic pentru Render ca să vadă IP-ul real

// Conexiune Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// --- RUTA 0: Confirmare că serverul merge (Fix pentru "Cannot GET /") ---
app.get('/', (req, res) => {
  res.send('✅ Backend-ul este ONLINE! Te rog folosește Frontend-ul pentru a scurta link-uri.');
});

// --- RUTA 1: Scurtare URL ---
app.post('/api/shorten', async (req, res) => {
  try {
    const { longUrl } = req.body;
    if (!validator.isURL(longUrl, { require_protocol: true })) {
      return res.status(400).json({ error: "URL invalid! Include http:// sau https://" });
    }

    // Verificare duplicate
    const existingCode = await redis.get(`url:${longUrl}`);
    if (existingCode) {
      return res.json({ shortCode: existingCode, msg: "Link existent." });
    }

    const shortCode = nanoid(6);
    await redis.set(`short:${shortCode}`, longUrl);
    await redis.set(`url:${longUrl}`, shortCode);
    await redis.set(`stats:${shortCode}`, 0);

    res.json({ shortCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Eroare internă la server." });
  }
});

// --- RUTA 2: Statistici ---
app.get('/api/stats/:code', async (req, res) => {
  const { code } = req.params;
  
  const longUrl = await redis.get(`short:${code}`);
  if (!longUrl) return res.status(404).json({ error: "Link inexistent" });

  const visits = await redis.get(`stats:${code}`);
  
  // Extragem istoricul (lista de vizite)
  const historyRaw = await redis.lrange(`history:${code}`, 0, 49);
  let history = [];
  try {
      history = historyRaw.map(item => JSON.parse(item));
  } catch (e) {
      history = [];
  }

  res.json({ 
    longUrl, 
    visits: visits || 0,
    history: history
  });
});

// --- RUTA 3: Redirectare + Tracking ---
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  const longUrl = await redis.get(`short:${code}`);

  if (longUrl) {
    // 1. Numărăm vizita
    await redis.incr(`stats:${code}`);

    // 2. Aflăm IP și Locație
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();

    let country = "Unknown";
    let city = "Unknown";

    if (ip !== '127.0.0.1' && ip !== '::1' && ip !== 'Unknown') {
        try {
            const geoRes = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 1500 });
            if (!geoRes.data.error) {
                country = geoRes.data.country_name || "Unknown";
                city = geoRes.data.city || "Unknown";
            }
        } catch (e) {
            console.log("GeoIP skip");
        }
    }

    const visitData = {
        date: new Date().toISOString(),
        ip: ip,
        country: country,
        city: city,
        userAgent: req.get('User-Agent') || "Unknown"
    };

    // Salvăm în istoric
    await redis.lpush(`history:${code}`, JSON.stringify(visitData));
    
    // Redirect
    res.redirect(longUrl);
  } else {
    res.status(404).send("Link invalid sau expirat.");
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});