import { apiFetch } from "./api";
import { peekAll, removeByIds } from "./offlineQueue";

export async function syncPendingShortens(options = {}) {
  const { onItemSynced, onItemFailed, onDone } = options;

  const pending = await peekAll();
  if (!pending.length) {
    onDone?.({ syncedAny: false, lastSyncedCode: null, remaining: 0 });
    return { syncedAny: false, lastSyncedCode: null, remaining: 0 };
  }

  let syncedAny = false;
  let lastSyncedCode = null;
  const syncedIds = [];

  for (const item of pending) {
    if (!navigator.onLine) break;

    const { res, data, networkError } = await apiFetch("/api/shorten", {
      method: "POST",
      body: JSON.stringify({ longUrl: item.longUrl }),
    });

    if (networkError || !res) break;
    if (!res.ok) {
      if (res.status >= 500) break;

      onItemFailed?.({ id: item.id, error: data?.error || `HTTP ${res.status}` });
      syncedIds.push(item.id);
      continue;
    }

    syncedAny = true;
    lastSyncedCode = data?.shortCode || lastSyncedCode;
    syncedIds.push(item.id);

    onItemSynced?.({
      id: item.id,
      shortCode: data?.shortCode,
      longUrl: item.longUrl,
    });
  }

  let remaining = pending.length;
  if (syncedIds.length) remaining = await removeByIds(syncedIds);

  onDone?.({ syncedAny, lastSyncedCode, remaining });
  return { syncedAny, lastSyncedCode, remaining };
}
