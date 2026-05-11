import { loadConfig } from "../config/loadConfig.js";
import { LLMClient } from "../llm/client.js";
import { healFromTraceback } from "../core/heal/pipeline.js";
import { captureError } from "./capture.js";

export function selfHeal(mode: "suggest" | "apply" = "suggest") {
  return function wrap<
    TArgs extends unknown[],
    TResult
  >(fn: (...args: TArgs) => TResult | Promise<TResult>) {
    return async (...args: TArgs): Promise<TResult> => {
      try {
        return await fn(...args);
      } catch (error) {
        const captured = captureError(error);
        const { config, projectRoot } = await loadConfig();
        const client = new LLMClient(config);
        await healFromTraceback(projectRoot, captured.stack, config, client, mode, config.heal.dryRun);
        throw error;
      }
    };
  };
}
