process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import "dotenv/config";
import { runPipeline } from "./pipeline.js";

runPipeline()
  .then((r) => {
    console.log("result:", r);
    process.exit(0);
  })
  .catch((e) => {
    console.error("fatal:", e);
    process.exit(1);
  });
