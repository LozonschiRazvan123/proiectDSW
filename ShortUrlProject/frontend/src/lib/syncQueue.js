import { apiFetch } from "./api";
import { peekAll, removeByIds } from "./offlineQueue";

export async function syncPendingShortens(options = {}) {
  const { onItemSynced, onItemFailed, onDone } = options;

  const pending = await peekAll();
  
  // Dacă nu e nimic în coadă, ne oprim
  if (!pending.length) {
    onDone?.({ syncedAny: false, remaining: 0 });
    return;
  }

  let syncedAny = false;
  const syncedIds = [];

  for (const item of pending) {
    // Dacă pică netul în timpul sincronizării, ne oprim
    if (!navigator.onLine) break;

    console.log(`🔄 Syncing: ${item.longUrl}...`);

    const { res, data, networkError } = await apiFetch("/api/shorten", {
      method: "POST",
      body: JSON.stringify({ longUrl: item.longUrl }),
    });

    // Dacă e eroare de rețea, ne oprim și reluăm data viitoare
    if (networkError) break;

    // Dacă serverul dă eroare (ex: 500), marcăm item-ul ca eșuat temporar dar continuăm cu restul? 
    // De obicei, dacă e 500, ne oprim. Dacă e 400 (bad request), îl ștergem.
    if (!res || !res.ok) {
      if (res && res.status < 500) {
        // Erori client (ex: URL invalid), nu are sens să reîncercăm la infinit
        syncedIds.push(item.id); 
      }
      onItemFailed?.({ id: item.id, error: data?.error });
      continue;
    }

    // SUCCES
    syncedAny = true;
    syncedIds.push(item.id);

    onItemSynced?.({
      id: item.id,
      shortCode: data?.shortCode,
      longUrl: item.longUrl,
    });
  }

  // Ștergem din coada locală tot ce s-a sincronizat cu succes (sau erori permanente)
  if (syncedIds.length) {
    await removeByIds(syncedIds);
  }

  const remaining = pending.length - syncedIds.length;
  
  onDone?.({ syncedAny, remaining });
}