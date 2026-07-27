# 🏠 Moshav Bot — בוט התראות דירות במושבים/קיבוצים

בוט שסורק את Yad2, Madlan וקבוצות פייסבוק, מסנן דירות לפי הקריטריונים שלך,
ושולח לך התראה מיידית בטלגרם. שומר ב-Supabase מה כבר נשלח כדי לא לקבל כפילויות.

> ⚠️ פייסבוק: השתמש **בחשבון ייעודי** (לא הראשי שלך). גרידה של פייסבוק מנוגדת
> לתנאי השימוש שלהם ועלולה לגרום לחסימת החשבון. הקצב כאן שמרני, אבל הסיכון קיים.
> Yad2 — גם כן שומרים על קצב נמוך ומכבד.

---

## שלב 1 — התקנה מקומית

צריך **Node.js 20+** מותקן ([nodejs.org](https://nodejs.org)).

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

---

## שלב 2 — Supabase (מסד הנתונים, חינמי וקבוע)

1. צור חשבון ב-[supabase.com](https://supabase.com) ו-Project חדש.
2. לך ל-**SQL Editor → New query**, הדבק את התוכן של `sql/schema.sql`, ולחץ Run.
3. לך ל-**Project Settings → API**, והעתק:
   - `Project URL` → ל-`SUPABASE_URL` בקובץ `.env`
   - מפתח `service_role` (לא `anon`) → ל-`SUPABASE_KEY`

---

## שלב 3 — טלגרם

1. בטלגרם, פתח שיחה עם **@BotFather** → שלח `/newbot` → תן שם → תקבל **token**.
   הדבק אותו ל-`TELEGRAM_BOT_TOKEN`.
2. פתח את הבוט החדש שלך ושלח לו "שלום".
3. הרץ:
   ```bash
   npm run telegram:chatid
   ```
   העתק את ה-`chat id` שמודפס ל-`TELEGRAM_CHAT_ID`.

---

## שלב 4 — הגדרת מה לחפש (`config/filters.js`)

זה הקובץ היחיד לעריכה — **וכבר מילאתי אותו עם הערכים שלך** (כתובות Yad2,
Madlan, קבוצות הפייסבוק, מחיר עד 4500, 2–3 חדרים). פתח אותו רק אם תרצה לשנות.

**להוסיף/לשנות כתובת Yad2 או Madlan:** בנה את החיפוש באתר עד שהתוצאות מסוננות
כרצונך, העתק את ה-URL מהדפדפן והדבק ל-`yad2SearchUrls` / `madlanSearchUrls`.

---

## שלב 5 — פייסבוק (אופציונלי)

כדי שהבוט לא יתחבר מחדש בכל ריצה (מפחית סיכון לחסימה), נתחבר פעם אחת
מקומית ונשמור את ה-session:

```bash
npm run fb:auth
```

ייפתח דפדפן — התחבר ידנית בחשבון הבוט, חזור לטרמינל ולחץ ENTER.
זה ידפיס מחרוזת ארוכה (base64) — העתק אותה ל-`FB_STORAGE_STATE_B64` ב-`.env`.

---

## שלב 6 — בדיקה מקומית (חשוב!)

הרצה ללא שליחה וללא כתיבה ל-DB — רק מדפיס מה נמצא:

```bash
npm run dry-run
```

הסתכל בפלט. אם Yad2 מחזיר 0 תוצאות, יישמר צילום מסך `yad2-debug-*.png` —
**שלח לי אותו ואת הפלט ונכייל יחד את החילוץ.** זה הצעד שדורש כיול בפועל,
כי מבנה ה-HTML של Yad2 משתנה ואי אפשר לדעת אותו מראש ב-100%.

כשהפלט נראה טוב, הרצה אמיתית (שולחת לטלגרם + שומרת):
```bash
npm run scrape
```

הרצה רציפה מקומית (שרת + תזמון):
```bash
npm start
```

---

## שלב 7 — העלאה ל-GitHub

```bash
git init
git add .
git commit -m "initial moshav bot"
# צור repo ריק ב-github.com, ואז:
git remote add origin https://github.com/USERNAME/moshav-bot.git
git branch -M main
git push -u origin main
```

מי שמעדיף בלי טרמינל: **GitHub Desktop** — גרור את התיקייה, Commit, Push.
(הקובץ `.gitignore` כבר דואג שה-`.env` והסיסמאות לא יעלו.)

---

## שלב 8 — פריסה ל-Render

1. ב-[render.com](https://render.com) → **New → Web Service** → חבר את ה-repo.
2. Render יזהה את `render.yaml` אוטומטית. ודא:
   - Build: `npm install && npx playwright install --with-deps chromium`
   - Start: `npm start`
   - Plan: **Free**
3. ב-**Environment** הוסף את המשתנים מ-`.env` (Token, chat id, Supabase, FB base64).
   **אל תעלה את קובץ `.env` עצמו** — מזינים ידנית כאן.
4. Deploy.

### חשוב — שמירה על השירות "ער"
התוכנית החינמית של Render מרדימה את השירות אחרי 15 דקות חוסר פעילות,
וה-cron הפנימי לא מעיר אותו. הפתרון:

1. צור חשבון חינמי ב-[UptimeRobot](https://uptimerobot.com).
2. הוסף **HTTP(s) monitor** לכתובת של השירות (למשל `https://moshav-bot.onrender.com/`)
   עם בדיקה כל **5 דקות**.

ככה השירות נשאר ער, ה-cron רץ בזמן, והכול נשאר בתוך 750 השעות החינמיות.

---

## פתרון תקלות

- **Yad2 מחזיר 0:** הרץ `npm run dry-run`, שלח לי את הצילום + הפלט לכיול.
- **פייסבוק נכשל:** ה-session פג. הרץ שוב `npm run fb:auth` ועדכן את ה-base64.
- **לא מגיעות התראות:** ודא ששלחת הודעה לבוט פעם אחת, ושה-chat id נכון.
- **Render: Playwright לא נמצא:** ודא ש-build command כולל
  `npx playwright install --with-deps chromium`.

---

## ארכיטקטורה

```
UptimeRobot ──ping──> Render (web service, חינמי)
                          │  node-cron כל 30 דק'
                          ▼
              ┌───────────────────────┐
              │  Yad2 + Madlan scraper │ (Playwright + יירוט API)
              │  Facebook scraper      │ (מבודד)
              └──────────┬────────────┘
                         ▼ סינון
                  Supabase (דדופ) ──חדש?──> Telegram ──> אתה 📱
```
