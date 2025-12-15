import { apiFetch } from "./api";
import { listPending, removeItem, markFailed } from "./offlineQueue";

// ✅ rulează când revii online (sau la refresh)
export async function syncPendingShortens({ onItemSynced, onDone } = {}) {
  const pending = await listPending();
  if (!pending.length) {
    onDone?.({ synced: 0, total: 0 });
    return { synced: 0, total: 0 };
  }

  let synced = 0;

  for (const item of pending) {
    try {
      const { res, data, networkError } = await apiFetch("/api/shorten", {
        method: "POST",
        body: JSON.stringify({ longUrl: item.longUrl }),
      });

      // dacă încă nu merge netul sau serverul pică, lăsăm în coadă
      if (networkError) {
        await markFailed(item.id, "Network error during sync");
        continue;
      }

      if (!res?.ok) {
        await markFailed(item.id, data?.error || "Server error during sync");
        continue;
      }

      // ✅ succes: ștergem din coadă
      await removeItem(item.id);
      synced += 1;

      onItemSynced?.({ local: item, server: data });
    } catch (e) {
      await markFailed(item.id, e?.message || "Unknown sync error");
    }
  }

  onDone?.({ synced, total: pending.length });
  return { synced, total: pending.length };
}
