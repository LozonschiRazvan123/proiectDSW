import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_secret";
process.env.ADMIN_USERS = "admin";
process.env.UPSTASH_REDIS_REST_URL = "http://fake";
process.env.UPSTASH_REDIS_REST_TOKEN = "fake";


vi.mock("axios", () => ({
  default: {
    get: vi.fn(async () => ({ data: { country_name: "Testland", city: "TestCity" } })),
  },
}));


const redisState = vi.hoisted(() => {
  const store = new Map();
  const sets = new Map();
  const lists = new Map();

  function getSet(key) {
    if (!sets.has(key)) sets.set(key, new Set());
    return sets.get(key);
  }
  function getList(key) {
    if (!lists.has(key)) lists.set(key, []);
    return lists.get(key);
  }

  class FakeRedis {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    }
    async set(key, value) {
      store.set(key, value);
      return "OK";
    }
    async del(key) {
      const had = store.delete(key);
      sets.delete(key);
      lists.delete(key);
      return had ? 1 : 0;
    }
    async incr(key) {
      const v = parseInt((await this.get(key)) || "0", 10) + 1;
      await this.set(key, String(v));
      return v;
    }
    async sadd(key, value) {
      getSet(key).add(value);
      return 1;
    }
    async srem(key, value) {
      const s = getSet(key);
      const had = s.delete(value);
      return had ? 1 : 0;
    }
    async smembers(key) {
      return Array.from(getSet(key));
    }
    async keys(pattern) {
      if (pattern === "short:*") {
        return Array.from(store.keys()).filter((k) => k.startsWith("short:"));
      }
      return Array.from(store.keys());
    }
    async lpush(key, value) {
      const l = getList(key);
      l.unshift(value);
      return l.length;
    }
    async lrange(key, start, stop) {
      const l = getList(key);
      const end = stop === -1 ? l.length - 1 : stop;
      return l.slice(start, end + 1);
    }
  }

  return { store, sets, lists, FakeRedis };
});


vi.mock("@upstash/redis", () => {
  return {
    Redis: class {
      constructor() {
        return new redisState.FakeRedis();
      }
    },
  };
});


const { app } = await import("../server.js");

async function register(username, password) {
  return request(app).post("/api/auth/register").send({ username, password });
}
async function login(username, password) {
  return request(app).post("/api/auth/login").send({ username, password });
}

describe("Backend API (auth + shorten + dashboard + redirect)", () => {
  beforeEach(() => {
    redisState.store.clear();
    redisState.sets.clear();
    redisState.lists.clear();
  });

  it("GET / -> Backend ONLINE", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Backend ONLINE");
  });

  it("Register: validează input + creează user + token", async () => {
    const bad1 = await register("", "123456");
    expect(bad1.status).toBe(400);

    const bad2 = await register("ab", "123456");
    expect(bad2.status).toBe(400);

    const bad3 = await register("user1", "123");
    expect(bad3.status).toBe(400);

    const ok = await register("user1", "123456");
    expect(ok.status).toBe(200);
    expect(ok.body).toHaveProperty("token");

    const dup = await register("user1", "123456");
    expect(dup.status).toBe(409);
  });

  it("Login: credențiale invalide vs ok", async () => {
    await register("user1", "123456");

    const bad = await login("user1", "wrongpass");
    expect(bad.status).toBe(401);

    const ok = await login("user1", "123456");
    expect(ok.status).toBe(200);
    expect(ok.body).toHaveProperty("token");
  });

  it("Auth /me: cere Bearer token", async () => {
    const no = await request(app).get("/api/auth/me");
    expect(no.status).toBe(401);

    await register("user1", "123456");
    const l = await login("user1", "123456");

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${l.body.token}`);

    expect(me.status).toBe(200);
    expect(me.body.username).toBe("user1");
  });

  it("POST /api/shorten: cere auth + validează URL", async () => {
    const no = await request(app).post("/api/shorten").send({ longUrl: "https://x.com" });
    expect(no.status).toBe(401);

    await register("user1", "123456");
    const l = await login("user1", "123456");

    const bad = await request(app)
      .post("/api/shorten")
      .set("Authorization", `Bearer ${l.body.token}`)
      .send({ longUrl: "notaurl" });
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post("/api/shorten")
      .set("Authorization", `Bearer ${l.body.token}`)
      .send({ longUrl: "https://example.com" });

    expect(ok.status).toBe(200);
    expect(ok.body).toHaveProperty("shortCode");
  });

  it("GET /:code => redirect + incrementează stats + history", async () => {
    await register("user1", "123456");
    const l = await login("user1", "123456");

    const s1 = await request(app)
      .post("/api/shorten")
      .set("Authorization", `Bearer ${l.body.token}`)
      .send({ longUrl: "https://example.com/a" });

    const r = await request(app).get(`/${s1.body.shortCode}`).set("User-Agent", "UnitTest UA");
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe("https://example.com/a");

    const stats = await request(app)
      .get(`/api/stats/${s1.body.shortCode}`)
      .set("Authorization", `Bearer ${l.body.token}`);

    expect(stats.status).toBe(200);
    expect(stats.body.visits).toBe(1);
  });
});
