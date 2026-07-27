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
    await page.waitForTimeout(2500 + Math.random() * 2500);
    await page.mouse.wheel(0, 2000);
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
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "he-IL",
    viewport: { width: 1366, height: 900 },
  });

  const results = [];
  for (const site of sites) {
    const items = await scrapeOne(context, site);
    results.push(...items);
  }

  await browser.close();
  return results;
}
