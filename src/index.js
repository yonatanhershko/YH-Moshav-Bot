import "dotenv/config";
import express from "express";
import cron from "node-cron";
import { runPipeline } from "./pipeline.js";
import { startTelegramListener } from "./telegramBot.js";

const app = express();
const PORT = process.env.PORT || 3000;

// הגשת תמונות באגים לצפייה מרחוק במידת הצורך
app.use("/debugs", express.static("debugs-images"));

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

  // הפעלת האזנה לפקודות מהטלגרם בזמן אמת
  startTelegramListener();

  const expr = process.env.CHECK_CRON;
  if (expr && expr !== "none" && cron.validate(expr)) {
    cron.schedule(expr, () => safeRun("cron"));
    console.log(`[scheduler] cron set: ${expr}`);
  } else {
    console.log("[scheduler] automatic cron disabled (on-demand only)");
  }

  if (process.env.RUN_ON_BOOT === "true") {
    safeRun("boot");
  }
});
