// חיבור ישיר ל-Supabase דרך REST API (ללא SDK שדורש WebSocket)
const DRY_RUN = process.env.DRY_RUN === "true";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=minimal",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getSeenIds() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return new Set();
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const data = await supabaseRequest(
      `listings?select=id&sent_at=gte.${encodeURIComponent(since)}`,
      { prefer: "return=representation" }
    );
    return new Set((data || []).map((r) => r.id));
  } catch (e) {
    console.error("[db] getSeenIds error:", e.message, e.cause || "");
    return new Set();
  }
}

export async function markSent(listing) {
  if (DRY_RUN) {
    console.log("[db] (dry-run) would save:", listing.id);
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[db] no Supabase configured, skipping save");
    return;
  }
  try {
    await supabaseRequest("listings", {
      method: "POST",
      body: JSON.stringify({
        id: listing.id,
        source: listing.source,
        title: listing.title,
        price: listing.price,
        rooms: listing.rooms,
        location: listing.location,
        url: listing.url,
        raw: listing.raw ?? null,
      }),
      headers: { Prefer: "resolution=merge-duplicates" },
    });
  } catch (e) {
    console.error("[db] markSent error:", e.message);
  }
}

export async function purgeOldListings() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return 0;
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const data = await supabaseRequest(
      `listings?sent_at=lt.${encodeURIComponent(cutoff)}`,
      { method: "DELETE", prefer: "return=representation" }
    );
    const count = data?.length ?? 0;
    if (count > 0) console.log(`[db] purged ${count} listings older than 90 days`);
    return count;
  } catch (e) {
    console.error("[db] purge error:", e.message);
    return 0;
  }
}
