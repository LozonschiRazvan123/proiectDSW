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
app.set('trust proxy', true);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

app.get('/', (req, res) => {
  res.send('✅ Backend-ul funcționează! Folosește Frontend-ul.');
});

// 1. SCURTARE
app.post('/api/shorten', async (req, res) => {
  try {
    const { longUrl } = req.body;
    if (!validator.isURL(longUrl, { require_protocol: true })) {
      return res.status(400).json({ error: "URL invalid!" });
    }

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
    res.status(500).json({ error: "Eroare internă." });
  }
});

// 2. STATISTICI (AICI ESTE FIX-UL CRITIC)
app.get('/api/stats/:code', async (req, res) => {
  const { code } = req.params;
  
  try {
    const longUrl = await redis.get(`short:${code}`);
    if (!longUrl) return res.status(404).json({ error: "Link inexistent" });

    const visits = await redis.get(`stats:${code}`);
    
    // Citim lista brută din Redis
    const historyRaw = await redis.lrange(`history:${code}`, 0, 49);
    
    // Procesare sigură a datelor
    const history = Array.isArray(historyRaw) 
      ? historyRaw.map(item => {
          // Dacă e deja obiect, îl returnăm direct
          if (typeof item === 'object' && item !== null) return item;
          // Dacă e text, încercăm să îl parsam
          try { return JSON.parse(item); } catch (e) { return null; }
        }).filter(item => item !== null) // Eliminăm eventualele erori
      : [];

    res.json({ 
      longUrl, 
      visits: visits || 0, 
      history: history 
    });

  } catch (error) {
    console.error("Eroare Stats:", error);
    res.status(500).json({ error: "Eroare la citirea statisticilor" });
  }
});

// 3. REDIRECT + TRACKING
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  const longUrl = await redis.get(`short:${code}`);

  if (longUrl) {
    await redis.incr(`stats:${code}`);

    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();

    let country = "Unknown";
    let city = "Unknown";

    if (ip !== '127.0.0.1' && ip !== '::1' && ip !== 'Unknown') {
        try {
            const geoRes = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 1500 });
            if (!geoRes.data.error) {
                country = geoRes.data.country_name || "Unknown";
                city = geoRes.data.city || "Unknown";
            }
        } catch (e) { console.log("GeoIP Error"); }
    }

    const visitData = {
        date: new Date().toISOString(),
        ip: ip,
        country: country,
        city: city,
        userAgent: req.get('User-Agent') || "Unknown"
    };

    // Salvăm ca string
    await redis.lpush(`history:${code}`, JSON.stringify(visitData));
    res.redirect(longUrl);
  } else {
    res.status(404).send("Link expirat.");
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));