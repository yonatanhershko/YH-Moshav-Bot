import "dotenv/config";
import { chromium } from "playwright";
import fs from "node:fs";

// הרץ פעם אחת מקומית:  npm run fb:auth
// ייפתח דפדפן, תתחבר ידנית לחשבון הבוט, ואז זה ישמור את ה-session.

const run = async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();
  await page.goto("https://www.facebook.com/login");

  console.log("\n>>> התחבר ידנית בחלון הדפדפן (כולל אימות דו-שלבי אם יש).");
  console.log(">>> כשתסיים ואתה רואה את הפיד, חזור לכאן ולחץ ENTER.\n");

  await new Promise((resolve) => process.stdin.once("data", resolve));

  await context.storageState({ path: "fb-state.json" });
  const b64 = Buffer.from(fs.readFileSync("fb-state.json")).toString("base64");

  console.log("\n✅ נשמר fb-state.json");
  console.log("\n📋 העתק את הערך הבא ל-FB_STORAGE_STATE_B64 (ב-.env ובהגדרות Render):\n");
  console.log(b64);
  console.log("\n");

  await browser.close();
  process.exit(0);
};

run();
