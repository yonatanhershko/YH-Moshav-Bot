import { scrapeJsonSites } from "./scrapers/jsonSites.js";
import { scrapeFacebook } from "./scrapers/facebook.js";
import { passesFilters } from "./util/normalize.js";
import { getSeenIds, markSent, purgeOldListings } from "./db.js";
import { sendAlert } from "./notify.js";

export async function runPipeline() {
  const startedAt = new Date().toISOString();
  console.log(`\n=== run started ${startedAt} ===`);

  const jsonItems = await scrapeJsonSites().catch((e) => {
    console.error("[pipeline] json-sites failed:", e.message);
    return [];
  });
  const fbItems = await scrapeFacebook().catch((e) => {
    console.error("[pipeline] facebook failed:", e.message);
    return [];
  });

  const all = [...jsonItems, ...fbItems];
  console.log(`[pipeline] scraped total: ${all.length}`);

  // סינון לפי ההגדרות
  const filtered = all.filter(passesFilters);
  console.log(`[pipeline] passed filters: ${filtered.length}`);

  // דדופ מול ה-DB
  const seen = await getSeenIds();
  const fresh = filtered.filter((l) => !seen.has(l.id));
  console.log(`[pipeline] new (not seen before): ${fresh.length}`);

  // שליחה + שמירה
  let sent = 0;
  for (const listing of fresh) {
    try {
      await sendAlert(listing);
      await markSent(listing);
      sent++;
      await new Promise((r) => setTimeout(r, 1200));
    } catch (e) {
      console.error("[pipeline] send/save error:", e.message, e.cause || "");
    }
  }

  // ניקוי מודעות ישנות מעל 3 חודשים
  const purged = await purgeOldListings();

  console.log(`=== run done: sent ${sent} alerts, purged ${purged} old ===\n`);
  return { scraped: all.length, fresh: fresh.length, sent, purged };
}
