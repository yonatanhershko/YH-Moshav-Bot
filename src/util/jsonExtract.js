import { makeId, parsePrice, parseRooms } from "./normalize.js";

const DRY_RUN = () => process.env.DRY_RUN === "true";

// מזהה אובייקט שנראה כמו מודעה (ללא תלות בשמות שדות מדויקים)
export function looksLikeListing(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const keys = Object.keys(obj).map((k) => k.toLowerCase());
  if (keys.length < 2) return false;
  const hasPrice = keys.some((k) => k.includes("price") || k.includes("cost") || k.includes("shekel") || k.includes("nis"));
  const hasId = keys.some(
    (k) => k === "id" || k.includes("token") || k.includes("orderid") || k.includes("adnumber") || k.includes("record") || k.includes("item_id") || k.includes("id_item")
  );
  const hasLoc = keys.some((k) =>
    ["address", "city", "neighborhood", "area", "title", "row1", "row2", "street", "settlement", "location", "line"].some((s) =>
      k.includes(s)
    )
  );
  return (hasPrice && hasId) || (hasPrice && hasLoc) || (hasId && hasLoc && keys.length >= 4);
}

// סריקה רקורסיבית של כל מבנה JSON ואיסוף אובייקטים שנראים כמו מודעות
export function collectListings(node, found = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectListings(item, found);
  } else if (node && typeof node === "object") {
    if (looksLikeListing(node)) found.push(node);
    for (const v of Object.values(node)) collectListings(v, found);
  }
  return found;
}

// חילוץ ערך של שדה לפי רשימת שמות אפשריים (גמיש לשינויי schema)
export function pick(obj, candidates, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 4) return null;
  for (const c of candidates) {
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === c.toLowerCase() && obj[key] != null) return obj[key];
    }
  }
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const r = pick(v, candidates, depth + 1);
      if (r != null) return r;
    }
  }
  return null;
}

// המרת אובייקט גולמי למבנה המנורמל של הבוט
export function normalizeListing(raw, { source, buildItemUrl }) {
  const externalId =
    pick(raw, ["token", "orderId", "adNumber", "id", "itemId", "item_id", "record_id", "link_token"]) ?? JSON.stringify(raw).slice(0, 40);
  const price = parsePrice(pick(raw, ["price", "price_text", "price_total", "cost", "raw_price"]));
  const rooms = parseRooms(pick(raw, ["rooms", "room", "rooms_text", "number_of_rooms"]));
  const title =
    pick(raw, ["title", "row1", "AdTitle", "addressTitle", "description", "text", "line1", "city_text", "street_text"]) ??
    `מודעת ${source}`;
  const location =
    pick(raw, ["address", "city", "neighborhood", "row2", "area", "streetName", "street_text", "city_text", "line2"]) ?? "";
  let url = pick(raw, ["url", "link", "canonicalUrl"]);
  if (!url) url = buildItemUrl(String(externalId));

  return {
    source,
    externalId: String(externalId),
    id: makeId(source, String(externalId)),
    title: String(title).trim().slice(0, 300),
    price,
    rooms,
    location: String(location).trim(),
    url,
    raw: DRY_RUN() ? raw : undefined,
  };
}
