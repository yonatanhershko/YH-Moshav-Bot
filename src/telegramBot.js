import { config, updateFilter, getFilterSummary } from "../config/filters.js";
import { runPipeline } from "./pipeline.js";

let lastUpdateId = 0;
let isPolling = false;
let isScrapingRunning = false;

async function sendMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.error("[telegram-bot] sendMessage error:", e.message);
  }
}

export async function handleIncomingMessage(msg) {
  const chatId = msg.chat?.id;
  const text = (msg.text || "").trim();
  if (!chatId || !text) return;

  const lowerText = text.toLowerCase();

  // 1) עזרה ותפריט ראשי
  if (lowerText === "/start" || lowerText === "/help" || text === "עזרה" || text === "תפריט") {
    const helpMsg = [
      "🤖 <b>בוט התראות דירות — תפריט פקודות</b>\n",
      "📥 <b>מבנה קלט (פקודות שאתה יכול לשלוח לבוט):</b>",
      "• <code>/scrape</code> או <code>סרוק</code> — הפעלת סריקה מיידית (Yad2, Madlan, Facebook)",
      "• <code>/rent</code> או <code>להשכרה</code> — סינון דירות להשכרה בלבד",
      "• <code>/sale</code> או <code>למכירה</code> — סינון דירות למכירה בלבד",
      "• <code>/maxprice 5000</code> או <code>עד 5000</code> — עדכון מחיר מקסימלי",
      "• <code>/rooms 2</code> או <code>2 חדרים</code> — עדכון מינימום חדרים",
      "• <code>/status</code> או <code>מצב</code> — הצגת הסינונים הנוכחיים\n",
      "📤 <b>מבנה פלט (איך הדירות מגיעות אלייך):</b>",
      "🏷️ <b>להשכרה / למכירה</b> • <b>מקור</b>",
      "🏠 <b>כותרת המודעה</b>",
      "💰 <b>מחיר:</b> X ₪",
      "🛏️ <b>חדרים:</b> Y",
      "📍 <b>מיקום:</b> עיר / מושב",
      "🔗 <u>קישור ישיר למודעה</u>",
    ].join("\n");
    await sendMessage(chatId, helpMsg);
    return;
  }

  // 2) הפעלת סריקה
  if (lowerText === "/scrape" || lowerText === "/run" || text === "סרוק" || text === "להריץ") {
    if (isScrapingRunning) {
      await sendMessage(chatId, "⏳ **סריקה כבר רצה ברקע**, אנא המתן לסיומה...");
      return;
    }
    isScrapingRunning = true;
    await sendMessage(chatId, "🔍 <b>מתחיל לסרוק דירות עכשיו ב-Yad2, Madlan ופייסבוק...</b>\nהודעה תישלח בסיום.");
    
    try {
      const res = await runPipeline();
      await sendMessage(
        chatId,
        `✅ <b>הסריקה הושלמה בהצלחה!</b>\n📊 נסרקו <b>${res.scraped}</b> מודעות, ונשלחו <b>${res.sent}</b> התראות חדשות.`
      );
    } catch (e) {
      await sendMessage(chatId, `❌ **שגיאה במהלך הסריקה:** ${e.message}`);
    } finally {
      isScrapingRunning = false;
    }
    return;
  }

  // 3) הגדרת להשכרה
  if (lowerText === "/rent" || text === "להשכרה") {
    updateFilter("dealType", "rent");
    await sendMessage(chatId, "✅ הסינון עודכן: <b>להשכרה בלבד</b> 🏷️");
    return;
  }

  // 4) הגדרת למכירה
  if (lowerText === "/sale" || text === "למכירה") {
    updateFilter("dealType", "sale");
    await sendMessage(chatId, "✅ הסינון עודכן: <b>למכירה בלבד</b> 🏷️");
    return;
  }

  // 5) עדכון מחיר מקסימלי (למשל: /maxprice 5000 או עד 5000)
  const priceMatch = text.match(/(?:\/maxprice|עד)\s*(\d+)/i);
  if (priceMatch) {
    const num = parseInt(priceMatch[1], 10);
    updateFilter("maxPrice", num);
    await sendMessage(chatId, `✅ המחיר המקסימלי עודכן ל-<b>${num.toLocaleString()} ₪</b> 💰`);
    return;
  }

  // 6) עדכון חדרים (למשל: /rooms 2 או 2 חדרים)
  const roomsMatch = text.match(/(?:\/rooms|\b(\d+))\s*חדרים?/i);
  if (roomsMatch) {
    const num = parseFloat(roomsMatch[1]);
    updateFilter("minRooms", num);
    await sendMessage(chatId, `✅ מינימום החדרים עודכן ל-<b>${num} חדרים</b> 🛏️`);
    return;
  }

  // 7) סטטוס סינונים
  if (lowerText === "/status" || text === "מצב" || text === "סינון") {
    await sendMessage(chatId, `⚙️ <b>הגדרות סינון נוכחיות:</b>\n\n${getFilterSummary()}`);
    return;
  }

  // פקודה לא מוכרת
  await sendMessage(
    chatId,
    "💡 לא זיהיתי את הפקודה. שלח <code>/help</code> או <code>תפריט</code> לצפייה ברשימת הפקודות."
  );
}

export function startTelegramListener() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[telegram-bot] TELEGRAM_BOT_TOKEN missing, listener disabled");
    return;
  }

  if (isPolling) return;
  isPolling = true;
  console.log("[telegram-bot] Interactive bot listener started...");

  async function poll() {
    while (isPolling) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`
        );
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const u of data.result) {
            lastUpdateId = u.update_id;
            if (u.message) {
              await handleIncomingMessage(u.message).catch((e) =>
                console.error("[telegram-bot] handle error:", e.message)
              );
            }
          }
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  poll();
}
