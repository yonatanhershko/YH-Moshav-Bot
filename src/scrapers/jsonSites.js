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
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    // המתנה של 5 שניות למעבר מסך האימות (Imperva / Verification)
    await page.waitForTimeout(5000);
    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(2500);

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
        .$$eval('a[href*="/item/"], a[href*="/listings/"], [data-testid^="feed-item"]', (els) =>
          els.map((e) => {
            const href = e.href || e.querySelector("a")?.href || "";
            const text = e.innerText || "";
            return { href, text };
          })
        )
        .catch(() => []);

      for (const d of domItems) {
        if (!d.href) continue;
        const match = d.href.match(/\/(?:item|listings)\/([a-zA-Z0-9]+)/);
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

    if (DRY_RUN && !raws.length) {
      await page.screenshot({ path: `${source}-debug-${Date.now()}.png` }).catch(() => {});
      console.warn(`[${source}] no listings found — saved debug screenshot`);
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
  });

  const results = [];
  for (const site of sites) {
    const items = await scrapeOne(context, site);
    results.push(...items);
  }

  await browser.close();
  return results;
}
