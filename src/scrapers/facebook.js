import { chromium } from "playwright";
import fs from "node:fs";
import { config } from "../../config/filters.js";
import { makeId, parsePrice } from "../util/normalize.js";

const DRY_RUN = process.env.DRY_RUN === "true";


async function buildContext(browser) {
  const b64 = process.env.FB_STORAGE_STATE_B64;
  const options = {
    locale: "he-IL",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  };

  if (b64) {
    try {
      options.storageState = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    } catch (e) {
      console.error("[fb] error parsing FB_STORAGE_STATE_B64:", e.message);
    }
  } else if (fs.existsSync("fb-state.json")) {
    options.storageState = "fb-state.json";
  }

  const ctx = await browser.newContext(options);
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  if (!b64 && !fs.existsSync("fb-state.json")) {
    const page = await ctx.newPage();
    await page.goto("https://www.facebook.com/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", process.env.FB_EMAIL || "");
    await page.fill("#pass", process.env.FB_PASSWORD || "");
    await page.click('button[name="login"]');
    await page.waitForTimeout(6000);
    await page.close();
  }
  return ctx;
}

function looksLikeRental(text) {
  const t = (text || "").toLowerCase();
  const rentWords = ["להשכרה", "להשכיר", "למכירה", "דירה", "בית", "יחידת דיור", "להעברה"];
  return rentWords.some((w) => t.includes(w));
}

export async function scrapeFacebook() {
  if (process.env.FB_ENABLED !== "true") return [];
  const groups = config.facebookGroupUrls || [];
  if (!groups.length) {
    console.log("[fb] no group URLs configured, skipping");
    return [];
  }

  let browser, context;
  const results = [];
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });
    context = await buildContext(browser);

    for (const groupUrl of groups) {
      try {
        const page = await context.newPage();
        const url = groupUrl.includes("?")
          ? groupUrl
          : `${groupUrl}?sorting_setting=CHRONOLOGICAL`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForTimeout(4000);

        for (let i = 0; i < (config.facebook.scrollRounds || 4); i++) {
          await page.mouse.wheel(0, 2500);
          await page.waitForTimeout(2000 + Math.random() * 1500);
        }

        const posts = await page.$$eval(
          'div[role="article"]',
          (nodes, max) =>
            nodes.slice(0, max).map((n) => {
              const text = n.innerText || "";
              const a = Array.from(n.querySelectorAll("a[href*='/posts/'], a[href*='/permalink/'], a[href*='story_fbid']"))[0];
              return { text, href: a ? a.href : null };
            }),
          config.facebook.postsPerGroup || 15
        );

        for (const p of posts) {
          if (!looksLikeRental(p.text)) continue;
          const externalId = p.href || (p.text || "").slice(0, 60);
          const priceMatch = (p.text || "").match(/(\d[\d,\.]{2,})\s*(?:₪|שח|ש"ח|שקל)/);
          results.push({
            source: "facebook",
            externalId,
            id: makeId("facebook", externalId),
            title: (p.text || "").split("\n").filter(Boolean)[0]?.slice(0, 200) || "פוסט פייסבוק",
            body: p.text || "",
            price: priceMatch ? parsePrice(priceMatch[1]) : null,
            rooms: null,
            location: groupUrl,
            url: p.href || groupUrl,
            raw: DRY_RUN ? { text: p.text } : undefined,
          });
        }

        console.log(`[fb] ${groupUrl.slice(0, 50)}... -> ${posts.length} posts scanned`);
        await page.close();
        await new Promise((r) => setTimeout(r, 5000 + Math.random() * 5000));
      } catch (e) {
        console.error(`[fb] error on group ${groupUrl.slice(0, 50)}:`, e.message);
      }
    }
  } catch (e) {
    console.error("[fb] fatal (isolated, won't affect Yad2):", e.message);
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
  return results;
}
