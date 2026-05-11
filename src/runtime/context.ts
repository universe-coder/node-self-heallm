import { loadConfig } from "../config/loadConfig.js";
import { LLMClient } from "../llm/client.js";
import { healFromTraceback } from "../core/heal/pipeline.js";
import { captureError } from "./capture.js";

let handlerInstalled = false;

export async function install(): Promise<void> {
  if (handlerInstalled) {
    return;
  }
  handlerInstalled = true;
  process.on("uncaughtException", (error) => {
    void (async () => {
      const { config, projectRoot } = await loadConfig();
      const client = new LLMClient(config);
      const captured = captureError(error);
      await healFromTraceback(projectRoot, captured.stack, config, client, "suggest", true);
    })();
  });
}
