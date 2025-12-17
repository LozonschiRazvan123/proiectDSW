const PROD_FALLBACK = "https://proiectdsw.onrender.com";
const DEV_FALLBACK = "http://localhost:5000";

const normalizeBase = (base) => (base || "").replace(/\/+$/, "");

export const getApiBase = () => {
  const fromEnv = normalizeBase(import.meta.env.VITE_API_BASE);
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return DEV_FALLBACK;
  }

  return PROD_FALLBACK;
};

export const getToken = () => localStorage.getItem("token");
export const setToken = (t) => localStorage.setItem("token", t);
export const clearToken = () => localStorage.removeItem("token");

export async function apiFetch(path, options = {}) {
  const base = getApiBase();
  const token = getToken();

  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    return { res, data, networkError: false };
  } catch (e) {
    return { res: null, data: { error: e?.message || "fetch failed" }, networkError: true };
  }
}
