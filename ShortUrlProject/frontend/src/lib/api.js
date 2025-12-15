export const getApiBase = () => import.meta.env.VITE_API_BASE || "http://localhost:5000";

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
    // ✅ aici intră când apare "TypeError: fetch failed"
    return { res: null, data: { error: e?.message || "fetch failed" }, networkError: true };
  }
}
