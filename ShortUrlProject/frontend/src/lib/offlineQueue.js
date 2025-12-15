import { openDB } from "idb";

const DB_NAME = "shorturl_offline_db";
const STORE = "shorten_queue";
const VERSION = 1;

async function getDb() {
  return openDB(DB_NAME, VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const st = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        st.createIndex("status", "status");
        st.createIndex("createdAt", "createdAt");
      }
    },
  });
}

// ✅ adaugă în coadă (pending)
export async function enqueueShorten(longUrl) {
  const db = await getDb();
  return db.add(STORE, {
    longUrl,
    status: "pending",
    createdAt: Date.now(),
    attempts: 0,
    lastError: null,
  });
}

export async function listPending() {
  const db = await getDb();
  return db.getAllFromIndex(STORE, "status", "pending");
}

export async function markFailed(id, message) {
  const db = await getDb();
  const rec = await db.get(STORE, id);
  if (!rec) return;
  rec.attempts = (rec.attempts || 0) + 1;
  rec.lastError = message || "Sync failed";
  await db.put(STORE, rec);
}

export async function removeItem(id) {
  const db = await getDb();
  return db.delete(STORE, id);
}

export async function countPending() {
  const pending = await listPending();
  return pending.length;
}
