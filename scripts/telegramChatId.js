import "dotenv/config";

// 1) פתח את הבוט שלך בטלגרם ושלח לו הודעה כלשהי ("שלום")
// 2) הרץ:  npm run telegram:chatid
// 3) העתק את ה-id שמודפס ל-TELEGRAM_CHAT_ID

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("חסר TELEGRAM_BOT_TOKEN ב-.env");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
const data = await res.json();

if (!data.ok) {
  console.error("שגיאה:", data);
  process.exit(1);
}
if (!data.result.length) {
  console.log("לא נמצאו הודעות. שלח הודעה לבוט בטלגרם ונסה שוב.");
  process.exit(0);
}

const seen = new Set();
for (const u of data.result) {
  const chat = u.message?.chat || u.channel_post?.chat;
  if (chat && !seen.has(chat.id)) {
    seen.add(chat.id);
    console.log(`chat id: ${chat.id}  (${chat.first_name || chat.title || ""})`);
  }
}
