import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "change_me";

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://lucky-muffin-b22166.netlify.app"
  ],
  credentials: true
}));
app.use(express.json());
app.set("trust proxy", true);

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.warn(" Lipsesc UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN în .env");
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const jsonSet = async (key, value) => redis.set(key, JSON.stringify(value));

const jsonGet = async (key) => {
  const v = await redis.get(key);
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const admins = (process.env.ADMIN_USERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const roleFor = (username) => (admins.includes(username) ? "admin" : "user");

const signToken = (username, role) =>
  jwt.sign({ username, role }, JWT_SECRET, { expiresIn: "2h" });

const auth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
};

const hashUserUrl = (username, longUrl) =>
  crypto.createHash("sha256").update(`${username}:${longUrl}`).digest("hex");


const getShortObject = async (code, fallbackOwner = null) => {
  const key = `short:${code}`;
  const raw = await jsonGet(key);
  if (!raw) return null;

  if (typeof raw === "string") {
    const obj = {
      longUrl: raw,
      owner: fallbackOwner || "unknown",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      migratedFromLegacy: true,
    };
    await jsonSet(key, obj);
    return obj;
  }

  const patched = {
    longUrl: raw.longUrl ?? raw.url ?? "",
    owner: raw.owner ?? fallbackOwner ?? "unknown",
    active: raw.active ?? true,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    deletedAt: raw.deletedAt ?? null,
  };

  const needPersist =
    patched.longUrl !== raw.longUrl ||
    patched.owner !== raw.owner ||
    patched.active !== raw.active ||
    patched.deletedAt !== raw.deletedAt;

  if (needPersist) await jsonSet(key, patched);
  return patched;
};

app.get("/", (_, res) => res.send("✅ Backend ONLINE"));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "username și password sunt obligatorii" });
    if (username.length < 3) return res.status(400).json({ error: "username minim 3" });
    if (password.length < 6) return res.status(400).json({ error: "parola minim 6" });

    const exists = await redis.get(`user:${username}`);
    if (exists) return res.status(409).json({ error: "User există deja" });

    const passwordHash = await bcrypt.hash(password, 10);
    const role = roleFor(username);

    await jsonSet(`user:${username}`, {
      username,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
    });

    const token = signToken(username, role);
    res.json({ token, username, role });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: err.message || "Eroare register" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "username și password sunt obligatorii" });

    const user = await jsonGet(`user:${username}`);
    if (!user?.passwordHash) return res.status(401).json({ error: "Credențiale invalide" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Credențiale invalide" });

    const role = roleFor(username);
    if (user.role !== role) {
      user.role = role;
      await jsonSet(`user:${username}`, user);
    }

    const token = signToken(username, role);
    res.json({ token, username, role });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message || "Eroare login" });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

app.post("/api/shorten", auth, async (req, res) => {
  try {
    const { longUrl } = req.body || {};
    if (!validator.isURL(longUrl || "", { require_protocol: true })) {
      return res.status(400).json({ error: "URL invalid (include http:// sau https://)" });
    }

    const username = req.user.username;
    const h = hashUserUrl(username, longUrl);

    const existingCode = await redis.get(`url:byUserLong:${h}`);
    if (existingCode) {
      const existingData = await getShortObject(existingCode, username);

      if (!existingData) {
        await redis.del(`url:byUserLong:${h}`);
      } else {
        if (existingData.active === false) {
          existingData.active = true;
          existingData.deletedAt = null;
          existingData.updatedAt = new Date().toISOString();
          existingData.owner = existingData.owner || username;

          await jsonSet(`short:${existingCode}`, existingData);
          await redis.sadd(`user:links:${existingData.owner}`, existingCode);

          return res.json({
            shortCode: existingCode,
            existing: true,
            reactivated: true,
            msg: "Link-ul exista dar era dezactivat. L-am reactivat.",
          });
        }

        await redis.sadd(`user:links:${existingData.owner || username}`, existingCode);

        return res.json({
          shortCode: existingCode,
          existing: true,
          msg: "Link-ul există deja pentru acest user.",
        });
      }
    }

    const shortCode = nanoid(6);

    await jsonSet(`short:${shortCode}`, {
      longUrl,
      owner: username,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });

    await redis.set(`url:byUserLong:${h}`, shortCode);
    await redis.set(`stats:${shortCode}`, 0);
    await redis.sadd(`user:links:${username}`, shortCode);

    res.json({ shortCode, existing: false });
  } catch (err) {
    console.error("SHORTEN ERROR:", err);
    res.status(500).json({ error: err.message || "Eroare shorten" });
  }
});

app.get("/api/user/links", auth, async (req, res) => {
  try {
    const username = req.user.username;
    const codes = (await redis.smembers(`user:links:${username}`)) || [];

    const items = await Promise.all(
      codes.map(async (code) => {
        const data = await getShortObject(code, username);
        if (!data) return null;

        if (data.active === false) return null;

        const visits = parseInt((await redis.get(`stats:${code}`)) || "0", 10);
        return {
          code,
          longUrl: data.longUrl,
          visits,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      })
    );

    res.json({ items: items.filter(Boolean) });
  } catch (err) {
    console.error("USER LINKS ERROR:", err);
    res.status(500).json({ error: err.message || "Eroare user links" });
  }
});

app.put("/api/user/links/:code", auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { longUrl } = req.body || {};

    if (!validator.isURL(longUrl || "", { require_protocol: true })) {
      return res.status(400).json({ error: "URL invalid" });
    }

    const data = await getShortObject(code, req.user.username);
    if (!data) return res.status(404).json({ error: "Link inexistent" });

    if (data.owner !== req.user.username && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    data.longUrl = longUrl;
    data.updatedAt = new Date().toISOString();
    await jsonSet(`short:${code}`, data);

    res.json({ ok: true });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: err.message || "Eroare update" });
  }
});

app.delete("/api/user/links/:code", auth, async (req, res) => {
  try {
    const { code } = req.params;
    const data = await getShortObject(code, req.user.username);
    if (!data) return res.status(404).json({ error: "Link inexistent" });

    if (data.owner !== req.user.username && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    data.active = false;
    data.deletedAt = new Date().toISOString();
    data.updatedAt = new Date().toISOString();
    await jsonSet(`short:${code}`, data);

    await redis.srem(`user:links:${data.owner}`, code);

    res.json({ ok: true, softDeleted: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: err.message || "Eroare delete" });
  }
});


app.get("/api/stats/:code", auth, async (req, res) => {
  try {
    const { code } = req.params;
    const data = await getShortObject(code, req.user.username);
    if (!data) return res.status(404).json({ error: "Link inexistent" });

    const isOwner = data.owner === req.user.username;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });

    const visits = parseInt((await redis.get(`stats:${code}`)) || "0", 10);

    const historyRaw = await redis.lrange(`history:${code}`, 0, 49);
    const history = (historyRaw || [])
      .map((x) => {
        if (typeof x === "object" && x !== null) return x;
        try { return JSON.parse(x); } catch { return null; }
      })
      .filter(Boolean);

    res.json({ longUrl: data.longUrl, visits, history, owner: data.owner });
  } catch (err) {
    console.error("STATS ERROR:", err);
    res.status(500).json({ error: err.message || "Eroare stats" });
  }
});

app.get("/api/admin/dashboard", auth, adminOnly, async (req, res) => {
  try {
    const keys = await redis.keys("short:*");
    const totalLinks = keys.length;

    let totalVisits = 0;
    const linksData = [];
    const countryStats = {};
    const dailyStats = {};

    await Promise.all(
      keys.map(async (key) => {
        const code = key.replace("short:", "");
        const data = await getShortObject(code, "unknown");
        if (!data) return;

        const visits = parseInt((await redis.get(`stats:${code}`)) || "0", 10);
        totalVisits += visits;

        const historyRaw = await redis.lrange(`history:${code}`, 0, -1);
        const history = (historyRaw || [])
          .map((x) => {
            if (typeof x === "object" && x !== null) return x;
            try { return JSON.parse(x); } catch { return null; }
          })
          .filter(Boolean);

        history.forEach((h) => {
          const c = h.country || "Unknown";
          countryStats[c] = (countryStats[c] || 0) + 1;

          if (h.date) {
            const day = h.date.split("T")[0];
            dailyStats[day] = (dailyStats[day] || 0) + 1;
          }
        });

        linksData.push({ code, longUrl: data.longUrl || "", visits, owner: data.owner || "" });
      })
    );

    const topLinks = linksData.sort((a, b) => b.visits - a.visits).slice(0, 10);

    const geoData = Object.entries(countryStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      chartData.push({
        date: d.toLocaleDateString("en-US", { weekday: "short" }),
        visits: dailyStats[dayStr] || 0,
      });
    }

    res.json({ totalLinks, totalVisits, topLinks, geoData, chartData });
  } catch (err) {
    console.error("ADMIN DASH ERROR:", err);
    res.status(500).json({ error: err.message || "Eroare dashboard" });
  }
});

app.get("/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const data = await getShortObject(code, "unknown");

    if (!data) return res.status(404).send("Link expirat / inexistent");
    if (data.active === false) return res.status(404).send("Link dezactivat");
    if (!data.longUrl) return res.status(404).send("Link expirat / inexistent");

    await redis.incr(`stats:${code}`);

    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown";
    if (typeof ip === "string" && ip.includes(",")) ip = ip.split(",")[0].trim();

    let country = "Unknown";
    let city = "Unknown";

    try {
      if (ip && ip !== "127.0.0.1" && ip !== "::1" && ip !== "Unknown") {
        if (process.env.IPSTACK_KEY) {
          const r = await axios.get(
            `http://api.ipstack.com/${ip}?access_key=${process.env.IPSTACK_KEY}`,
            { timeout: 2000 }
          );
          country = r.data?.country_name || "Unknown";
          city = r.data?.city || "Unknown";
        } else {
          const r = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 2000 });
          if (!r.data?.error) {
            country = r.data?.country_name || "Unknown";
            city = r.data?.city || "Unknown";
          }
        }
      } else {
        country = "Localhost";
      }
    } catch {}

    const visitData = {
      date: new Date().toISOString(),
      ip,
      country,
      city,
      userAgent: req.get("User-Agent") || "Unknown",
    };

    await redis.lpush(`history:${code}`, JSON.stringify(visitData));
    res.redirect(data.longUrl);
  } catch (err) {
    console.error("REDIRECT ERROR:", err);
    res.status(500).send("Server error");
  }
});

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}