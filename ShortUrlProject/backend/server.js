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
app.set('trust proxy', true); // Necesar pentru IP real

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// --- SCURTARE URL ---
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
    res.status(500).json({ error: err.message });
  }
});

// --- STATISTICI (Aici era problema posibilă) ---
app.get('/api/stats/:code', async (req, res) => {
  const { code } = req.params;
  
  const longUrl = await redis.get(`short:${code}`);
  if (!longUrl) return res.status(404).json({ error: "Link inexistent" });

  const visits = await redis.get(`stats:${code}`);
  
  // Luăm istoricul (dacă există). Dacă nu, returnăm array gol []
  const historyRaw = await redis.lrange(`history:${code}`, 0, 49);
  let history = [];
  
  try {
      history = historyRaw.map(item => JSON.parse(item));
  } catch (e) {
      console.error("Eroare la parsarea istoricului:", e);
      history = [];
  }

  res.json({ 
    longUrl, 
    visits: visits || 0,
    history: history
  });
});

// --- REDIRECTARE + TRACKING ---
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  const longUrl = await redis.get(`short:${code}`);

  if (longUrl) {
    // Incrementăm vizitele
    await redis.incr(`stats:${code}`);

    // Tracking IP și Locație
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();

    let country = "Unknown";
    let city = "Unknown";

    // Încercăm să luăm locația (doar dacă nu e localhost)
    if (ip !== '127.0.0.1' && ip !== '::1' && ip !== 'Unknown') {
        try {
            const geoRes = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 2000 });
            if (!geoRes.data.error) {
                country = geoRes.data.country_name || "Unknown";
                city = geoRes.data.city || "Unknown";
            }
        } catch (e) {
            console.log("GeoIP timeout/error (neignorat)");
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
  console.log(`Backend running on http://localhost:${PORT}`);
});