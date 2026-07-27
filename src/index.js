import "dotenv/config";
import express from "express";
import cron from "node-cron";
import { runPipeline } from "./pipeline.js";

const app = express();
const PORT = process.env.PORT || 3000;

let lastRun = null;
let running = false;

async function safeRun(trigger) {
  if (running) {
    console.log(`[scheduler] skip (${trigger}) — previous run still going`);
    return;
  }
  running = true;
  try {
    const r = await runPipeline();
    lastRun = { at: new Date().toISOString(), trigger, ...r };
  } catch (e) {
    console.error("[scheduler] run error:", e.message);
  } finally {
    running = false;
  }
}

app.get("/", (_req, res) => {
  res.json({ status: "ok", lastRun });
});
app.get("/health", (_req, res) => res.send("ok"));

// אפשרות להפעלה ידנית בדפדפן
app.get("/run", async (_req, res) => {
  safeRun("manual");
  res.json({ status: "started", note: "running in background" });
});

app.listen(PORT, () => {
  console.log(`[server] listening on ${PORT}`);

  const expr = process.env.CHECK_CRON || "*/30 * * * *";
  if (cron.validate(expr)) {
    cron.schedule(expr, () => safeRun("cron"));
    console.log(`[scheduler] cron set: ${expr}`);
  } else {
    console.error(`[scheduler] invalid CHECK_CRON: ${expr}`);
  }

  if (process.env.RUN_ON_BOOT === "true") {
    safeRun("boot");
  }
});
