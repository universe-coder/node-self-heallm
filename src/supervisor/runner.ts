import { spawn } from "node:child_process";

import { loadConfig } from "../config/loadConfig.js";
import { LLMClient } from "../llm/client.js";
import { healFromTraceback } from "../core/heal/pipeline.js";
import { extractTraceback } from "./tbParser.js";

export async function runSupervised(
  command: string[],
  project?: string,
  autoApply = false,
  dryRun = true
): Promise<number> {
  const { config, projectRoot } = await loadConfig(project);
  const client = new LLMClient(config);
  let restarts = 0;

  while (true) {
    const { code, stderr } = await new Promise<{ code: number; stderr: string }>((resolve) => {
      const proc = spawn(command[0], command.slice(1), {
        cwd: projectRoot,
        stdio: ["inherit", "inherit", "pipe"]
      });
      let stderrBuffer = "";
      proc.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf8");
        stderrBuffer += text;
        process.stderr.write(text);
      });
      proc.on("close", (exitCode) => {
        resolve({ code: exitCode ?? 1, stderr: stderrBuffer });
      });
    });

    const traceback = extractTraceback(stderr);
    const shouldRetry =
      traceback &&
      config.supervisor.retryExitCodes.includes(code) &&
      restarts < config.supervisor.maxRestarts;

    if (traceback) {
      await healFromTraceback(
        projectRoot,
        traceback,
        config,
        client,
        autoApply ? "apply" : "suggest",
        dryRun
      );
    }

    if (!shouldRetry) {
      return code;
    }
    restarts += 1;
  }
}
