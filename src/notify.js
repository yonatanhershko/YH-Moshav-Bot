const DRY_RUN = process.env.DRY_RUN === "true";

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatMessage(listing) {
  const lines = [];
  const sourceLabel = listing.source === "facebook" ? "📘 פייסבוק" : "🏠 Yad2";
  lines.push(`<b>${sourceLabel}</b>`);
  if (listing.title) lines.push(escapeHtml(listing.title));
  const meta = [];
  if (listing.price != null) meta.push(`💰 ${listing.price.toLocaleString()} ₪`);
  if (listing.rooms != null) meta.push(`🛏️ ${listing.rooms} חד׳`);
  if (listing.location) meta.push(`📍 ${escapeHtml(listing.location)}`);
  if (meta.length) lines.push(meta.join("  •  "));
  if (listing.url) lines.push(`\n${listing.url}`);
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
    console.error("[notify] Telegram error:", res.status, body);
  }
}
