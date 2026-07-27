import crypto from "node:crypto";
import { config } from "../../config/filters.js";

// מבנה מודעה מנורמל:
// { source, externalId, title, price, rooms, location, url, raw }

export function makeId(source, externalId) {
  return crypto
    .createHash("sha256")
    .update(`${source}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

// בדיקה אם מודעה עוברת את הסינון של המשתמש
export function passesFilters(listing) {
  const f = config.filters;
  const text = `${listing.title || ""} ${listing.body || ""} ${listing.location || ""}`.toLowerCase();

  if (f.minPrice != null && listing.price != null && listing.price < f.minPrice) return false;
  if (f.maxPrice != null && listing.price != null && listing.price > f.maxPrice) return false;
  if (f.minRooms != null && listing.rooms != null && listing.rooms < f.minRooms) return false;
  if (f.maxRooms != null && listing.rooms != null && listing.rooms > f.maxRooms) return false;

  if (f.blockKeywords?.length) {
    for (const kw of f.blockKeywords) {
      if (text.includes(kw.toLowerCase())) return false;
    }
  }

  if (f.requireKeywords?.length) {
    const hit = f.requireKeywords.some((kw) => text.includes(kw.toLowerCase()));
    if (!hit) return false;
  }

  return true;
}

// המרת מחרוזת מחיר ("4,500 ₪") למספר
export function parsePrice(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const digits = String(value).replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : null;
}

export function parseRooms(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const m = String(value).match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}
