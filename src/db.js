import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.env.DRY_RUN === "true";

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: { persistSession: false },
  });
}

export async function getSeenIds() {
  if (!supabase) return new Set();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("listings")
    .select("id")
    .gte("sent_at", since);
  if (error) {
    console.error("[db] getSeenIds error:", error.message);
    return new Set();
  }
  return new Set(data.map((r) => r.id));
}

export async function markSent(listing) {
  if (DRY_RUN) {
    console.log("[db] (dry-run) would save:", listing.id);
    return;
  }
  if (!supabase) {
    console.warn("[db] no Supabase configured, skipping save");
    return;
  }
  const { error } = await supabase.from("listings").upsert(
    {
      id: listing.id,
      source: listing.source,
      title: listing.title,
      price: listing.price,
      rooms: listing.rooms,
      location: listing.location,
      url: listing.url,
      raw: listing.raw ?? null,
    },
    { onConflict: "id" }
  );
  if (error) console.error("[db] markSent error:", error.message);
}

export async function purgeOldListings() {
  if (!supabase) return 0;
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("listings")
    .delete()
    .lt("sent_at", cutoff)
    .select("id");
  if (error) {
    console.error("[db] purge error:", error.message);
    return 0;
  }
  const count = data?.length ?? 0;
  if (count > 0) console.log(`[db] purged ${count} listings older than 90 days`);
  return count;
}
