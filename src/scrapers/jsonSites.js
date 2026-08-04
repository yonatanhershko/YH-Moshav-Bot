import fs from "node:fs";
import { chromium } from "playwright";
import { config } from "../../config/filters.js";
import { collectListings, normalizeListing } from "../util/jsonExtract.js";

const DRY_RUN = process.env.DRY_RUN === "true";

const ITEM_URL = {
  yad2: (id) => `https://www.yad2.co.il/item/${id}`,
  madlan: (id) => `https://www.madlan.co.il/listings/${id}`,
};

function getSites() {
  const sites = [];
  for (const url of config.yad2SearchUrls || []) sites.push({ source: "yad2", url });
  for (const url of config.madlanSearchUrls || []) sites.push({ source: "madlan", url });
  return sites;
}

async function scrapeOne(context, { source, url }) {
  const page = await context.newPage();
  const jsonResponses = [];

  page.on("response", async (res) => {
    try {
      const ct = res.headers()["content-type"] || "";
      if (ct.includes("application/json")) {
        const body = await res.json().catch(() => null);
        if (body) jsonResponses.push(body);
      }
    } catch {}
  });

  try {
    // ניסיון טעינה מהיר עם Timeout של 15 שניות בלבד
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(async () => {
      console.warn(`[${source}] first navigation timeout, retrying with fast fallback...`);
      await page.goto(url, { waitUntil: "commit", timeout: 15000 });
    });
    
    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(2000);

    const raws = [];

    const embedded = await page
      .$$eval('script[type="application/json"], #__NEXT_DATA__', (els) =>
        els.map((e) => e.textContent)
      )
      .catch(() => []);
    for (const txt of embedded) {
      try {
        raws.push(...collectListings(JSON.parse(txt)));
      } catch {}
    }

    for (const body of jsonResponses) raws.push(...collectListings(body));

    // נפילת סמך: אם לא נמצאו מודעות דרך JSON, חלץ ישירות מאלמנטי ה-DOM
    if (!raws.length) {
      const domItems = await page
        .$$eval('a[href*="/item/"], a[href*="/listings/"], a[href*="/for-rent/"], a[href*="/bulletin/"], [data-testid^="feed-item"], div[class*="feed_item"]', (els) =>
          els.map((e) => {
            const href = e.href || e.querySelector("a")?.href || "";
            const text = e.innerText || "";
            return { href, text };
          })
        )
        .catch(() => []);

      for (const d of domItems) {
        if (!d.href) continue;
        const match = d.href.match(/\/(?:item|listings|for-rent|bulletin)\/([a-zA-Z0-9_-]+)/);
        const externalId = match ? match[1] : null;
        if (!externalId) continue;

        const lines = d.text.split("\n").map((l) => l.trim()).filter(Boolean);
        raws.push({
          id: externalId,
          orderId: externalId,
          url: d.href,
          title: lines[0] || `מודעה מ-${source}`,
          price: d.text,
          rooms: d.text,
          location: lines[1] || "",
        });
      }
    }

    if (!raws.length) {
      if (!fs.existsSync("debugs-images")) {
        fs.mkdirSync("debugs-images", { recursive: true });
      }
      const screenshotPath = `debugs-images/${source}-debug-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath }).catch(() => {});
      console.warn(`[${source}] no listings found — saved debug screenshot to ${screenshotPath}`);
    }

    const normalized = raws.map((r) =>
      normalizeListing(r, { source, buildItemUrl: ITEM_URL[source] })
    );

    const seen = new Set();
    const out = [];
    for (const n of normalized) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      out.push(n);
      if (out.length >= 10) break; // הגבלה ל-10 מודעות לכל כתובת כדי שהסריקה תהיה מהירה ולא תעמיס
    }
    console.log(`[${source}] ${url.slice(0, 55)}... -> ${out.length} items`);
    return out;
  } catch (e) {
    console.error(`[${source}] error on ${url.slice(0, 55)}:`, e.message);
    return [];
  } finally {
    await page.close().catch(() => {});
  }
}

export async function scrapeJsonSites() {
  const sites = getSites();
  if (!sites.length) {
    console.log("[json-sites] no URLs configured, skipping");
    return [];
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--no-zygote",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "he-IL",
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
      "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
    },
  });

  // הסוואת הדפדפן מפני מנגנוני הגנה (Imperva/Cloudflare)
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "languages", { get: () => ["he-IL", "he", "en-US", "en"] });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    window.chrome = {
      runtime: {},
      loadTimes: function () {},
      csi: function () {},
      app: {},
    };
    if (navigator.permissions && navigator.permissions.query) {
      const orig = navigator.permissions.query;
      navigator.permissions.query = (p) =>
        p.name === "notifications"
          ? Promise.resolve({ state: Notification.permission })
          : orig(p);
    }
  });

  const results = [];
  for (const site of sites) {
    let items = await scrapeOne(context, site);
    
    // ניסיון חוזר במצב Mobile אם לא נמצאו תוצאות ב-Desktop
    if (!items.length && site.source === "yad2") {
      console.log(`[yad2] retrying ${site.url.slice(0, 45)} with mobile user agent...`);
      const mobileContext = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
        viewport: { width: 390, height: 844 },
      });
      items = await scrapeOne(mobileContext, site);
      await mobileContext.close().catch(() => {});
    }

    results.push(...items);
  }

  await browser.close();
  return results;
}
