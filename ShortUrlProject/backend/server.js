// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';
import validator from 'validator';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Permite cereri de la React
app.use(express.json()); // Permite citirea JSON-urilor

// Conexiune Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// --- RUTE ---

// 1. Scurtare URL
app.post('/api/shorten', async (req, res) => {
  try {
    const { longUrl } = req.body;

    // Validare
    if (!validator.isURL(longUrl, { require_protocol: true })) {
      return res.status(400).json({ error: "URL invalid (pune http:// sau https://)" });
    }

    // Verificare duplicate
    const existingCode = await redis.get(`url:${longUrl}`);
    if (existingCode) {
      return res.json({ shortCode: existingCode, msg: "Deja exista" });
    }

    // Generare ID (6 caractere)
    const shortCode = nanoid(6);

    // Salvare în Redis
    await redis.set(`short:${shortCode}`, longUrl);
    await redis.set(`url:${longUrl}`, shortCode);
    await redis.set(`stats:${shortCode}`, 0);

    res.json({ shortCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Statistici
app.get('/api/stats/:code', async (req, res) => {
  const { code } = req.params;
  const longUrl = await redis.get(`short:${code}`);
  const visits = await redis.get(`stats:${code}`);

  if (!longUrl) return res.status(404).json({ error: "Nu a fost găsit" });

  res.json({ longUrl, visits: visits || 0 });
});

// 3. Redirectare (Aceasta trebuie să fie ultima rută)
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  const longUrl = await redis.get(`short:${code}`);

  if (longUrl) {
    await redis.incr(`stats:${code}`);
    res.redirect(longUrl);
  } else {
    res.status(404).send("URL Scurt Inexistent");
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});