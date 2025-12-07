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

app.get('/', (req, res) => res.send('✅ Backend ONLINE.'));

// 1. SCURTARE
app.post('/api/shorten', async (req, res) => {
  try {
    const { longUrl } = req.body;
    if (!validator.isURL(longUrl, { require_protocol: true })) {
      return res.status(400).json({ error: "URL invalid!" });
    }

    const existingCode = await redis.get(`url:${longUrl}`);
    if (existingCode) {
      return res.json({ shortCode: existingCode, existing: true, msg: "⚠️ Acest link există deja. Iată codul vechi." });
    }

    const shortCode = nanoid(6);
    await redis.set(`short:${shortCode}`, longUrl);
    await redis.set(`url:${longUrl}`, shortCode);
    await redis.set(`stats:${shortCode}`, 0);

    res.json({ shortCode, existing: false });
  } catch (err) {
    res.status(500).json({ error: "Eroare internă." });
  }
});

// 2. STATISTICI SINGLE
app.get('/api/stats/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const longUrl = await redis.get(`short:${code}`);
    if (!longUrl) return res.status(404).json({ error: "Link inexistent" });

    const visits = await redis.get(`stats:${code}`);
    const historyRaw = await redis.lrange(`history:${code}`, 0, 49);
    
    const history = Array.isArray(historyRaw) 
      ? historyRaw.map(item => {
          if (typeof item === 'object' && item !== null) return item;
          try { return JSON.parse(item); } catch (e) { return null; }
        }).filter(Boolean)
      : [];

    res.json({ longUrl, visits: visits || 0, history });
  } catch (e) {
    res.status(500).json({ error: "Eroare date." });
  }
});

// --- RUTA 3: ADMIN DASHBOARD (NOU) ---
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    // 1. Găsim toate cheile care încep cu "short:"
    const keys = await redis.keys('short:*');
    const totalLinks = keys.length;
    let totalVisits = 0;
    
    const linksData = [];
    const countryStats = {};
    const dailyStats = {};

    // 2. Iterăm prin fiecare link
    await Promise.all(keys.map(async (key) => {
      const code = key.replace('short:', '');
      const longUrl = await redis.get(key);
      const visits = parseInt(await redis.get(`stats:${code}`) || '0');
      
      totalVisits += visits;

      // Luăm istoricul
      const historyRaw = await redis.lrange(`history:${code}`, 0, -1);
      const history = historyRaw.map(item => {
         try { return typeof item === 'object' ? item : JSON.parse(item); } catch{ return null; }
      }).filter(Boolean);

      // Calculăm țările și zilele
      history.forEach(h => {
        const c = h.country || 'Unknown';
        countryStats[c] = (countryStats[c] || 0) + 1;

        if (h.date) {
            const day = h.date.split('T')[0];
            dailyStats[day] = (dailyStats[day] || 0) + 1;
        }
      });

      linksData.push({ code, longUrl, visits });
    }));

    // 3. Sortăm Top Link-uri
    const topLinks = linksData.sort((a, b) => b.visits - a.visits).slice(0, 10);

    // 4. Formatăm datele
    const geoData = Object.entries(countryStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Ultimele 7 zile
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      chartData.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        visits: dailyStats[dayStr] || 0
      });
    }

    res.json({ totalLinks, totalVisits, topLinks, geoData, chartData });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Eroare dashboard" });
  }
});

// 4. REDIRECT
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  const longUrl = await redis.get(`short:${code}`);

  if (longUrl) {
    await redis.incr(`stats:${code}`);
    
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();

    let country = "Unknown"; let city = "Unknown";
    if (ip !== '127.0.0.1' && ip !== '::1' && ip !== 'Unknown') {
        try {
            const geoRes = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 1500 });
            if (!geoRes.data.error) { country = geoRes.data.country_name; city = geoRes.data.city; }
        } catch (e) {}
    }

    const visitData = { date: new Date().toISOString(), ip, country, city, userAgent: req.get('User-Agent') || "Unknown" };
    await redis.lpush(`history:${code}`, JSON.stringify(visitData));
    res.redirect(longUrl);
  } else { res.status(404).send("Link expirat."); }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));