const KEY = "offline_shortens_v1";

const readQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

const writeQueue = (arr) => {
  localStorage.setItem(KEY, JSON.stringify(arr));
};

export async function enqueueShorten(longUrl) {
  const q = readQueue();
  q.push({
    id: crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    longUrl,
    createdAt: new Date().toISOString(),
  });
  writeQueue(q);
  return q.length;
}

export async function countPending() {
  return readQueue().length;
}

export async function peekAll() {
  return readQueue();
}

export async function removeByIds(ids = []) {
  const set = new Set(ids);
  const q = readQueue().filter((x) => !set.has(x.id));
  writeQueue(q);
  return q.length;
}
