import { config } from "../config/filters.js";

const DRY_RUN = process.env.DRY_RUN === "true";

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatMessage(listing) {
  const lines = [];
  const dealTypeBadge = config.filters.dealType === "sale" ? "🏷️ <b>למכירה</b>" : "🏷️ <b>להשכרה</b>";
  const sourceLabel = listing.source === "facebook" ? "📘 פייסבוק" : listing.source === "yad2" ? "🏠 Yad2" : "🏢 מדלן";
  
  lines.push(`${dealTypeBadge}  •  ${sourceLabel}`);
  if (listing.title) lines.push(`🏠 <b>${escapeHtml(listing.title)}</b>`);
  
  if (listing.price != null) lines.push(`💰 <b>מחיר:</b> ${listing.price.toLocaleString()} ₪`);
  if (listing.rooms != null) lines.push(`🛏️ <b>חדרים:</b> ${listing.rooms}`);
  if (listing.location) lines.push(`📍 <b>מיקום:</b> ${escapeHtml(listing.location)}`);
  if (listing.url) lines.push(`\n🔗 <a href="${listing.url}">לצפייה במודעה המקורית לחץ כאן</a>`);
  
  return lines.join("\n");
}

export async function sendAlert(listing) {
  const msg = formatMessage(listing);

  if (DRY_RUN) {
    console.log("\n----- (dry-run) Telegram -----\n" + msg + "\n------------------------------");
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[notify] missing Telegram credentials");
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[notify] Telegram API error:", res.status, body);
    }
  } catch (e) {
    console.error("[notify] Telegram fetch failed:", e.message, e.cause || "");
  }
}
