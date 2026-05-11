#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { Command } from "commander";

import { readRecent } from "../audit/log.js";
import { defaultConfigTemplate, DEFAULT_CONFIG_FILE } from "../config/defaultConfigTemplate.js";
import { loadConfig } from "../config/loadConfig.js";
import { runIndex } from "../core/index/indexer.js";
import { healFromTraceback } from "../core/heal/pipeline.js";
import { LLMClient } from "../llm/client.js";
import { runSupervised } from "../supervisor/runner.js";

async function readStdin(): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

const program = new Command();
program.name("self-heal").description("Node self-healing runtime").version("0.1.0");

program
  .command("init")
  .option("-f, --force", "overwrite existing config", false)
  .option("-p, --project <path>", "project root")
  .action(async (opts: { force: boolean; project?: string }) => {
    const root = path.resolve(opts.project ?? process.cwd());
    const dest = path.join(root, DEFAULT_CONFIG_FILE);
    try {
      await fs.access(dest);
      if (!opts.force) {
        throw new Error(`${DEFAULT_CONFIG_FILE} already exists. Use --force to overwrite.`);
      }
    } catch {
      // file does not exist
    }
    await fs.writeFile(dest, defaultConfigTemplate, "utf8");
    console.log(`Wrote ${dest}`);
  });

program
  .command("index")
  .option("-p, --project <path>", "project root")
  .action(async (opts: { project?: string }) => {
    const { config, projectRoot } = await loadConfig(opts.project);
    if (config.llm.provider === "anthropic") {
      throw new Error("Anthropic provider does not support embeddings for index command.");
    }
    const client = new LLMClient(config);
    if (!client.isConfigured()) {
      throw new Error(`Set ${config.llm.apiKeyEnv} for embeddings.`);
    }
    const result = await runIndex(projectRoot, config, client);
    console.log(`Indexed ${result.files} files, ${result.chunks} chunks.`);
  });

program
  .command("heal")
  .option("--tb <path>", "traceback file")
  .option("-p, --project <path>", "project root")
  .option("--apply", "apply patch", false)
  .option("--auto", "force auto-apply", false)
  .option("--dry-run", "dry run mode", true)
  .option("--no-dry-run", "disable dry run")
  .action(async (opts: { tb?: string; project?: string; apply: boolean; auto: boolean; dryRun: boolean }) => {
    const { config, projectRoot } = await loadConfig(opts.project);
    const client = new LLMClient(config);
    if (!client.isConfigured()) {
      throw new Error(`Set ${config.llm.apiKeyEnv}.`);
    }

    const tracebackText =
      opts.tb !== undefined
        ? await fs.readFile(path.resolve(opts.tb), "utf8")
        : process.stdin.isTTY
          ? ""
          : await readStdin();
    if (!tracebackText.trim()) {
      throw new Error("Provide --tb FILE or pipe traceback to stdin.");
    }

    const mode: "suggest" | "apply" = opts.auto || (opts.apply && !opts.dryRun) ? "apply" : "suggest";
    const result = await healFromTraceback(projectRoot, tracebackText, config, client, mode, opts.dryRun);
    console.log(result.message);
    if (result.touchedPaths?.length) {
      console.log(`Paths: ${result.touchedPaths.join(", ")}`);
    }
  });

program
  .command("run")
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .option("--auto", "auto apply patches", false)
  .option("--dry-run", "dry run mode", true)
  .option("--no-dry-run", "disable dry run")
  .option("-p, --project <path>", "project root")
  .argument("<command...>", "command to run")
  .action(
    async (command: string[], opts: { auto: boolean; dryRun: boolean; project?: string }) => {
      const code = await runSupervised(command, opts.project, opts.auto, opts.dryRun);
      process.exitCode = code;
    }
  );

program
  .command("status")
  .option("-p, --project <path>", "project root")
  .option("-n, --limit <number>", "limit", "15")
  .action(async (opts: { project?: string; limit: string }) => {
    const { projectRoot } = await loadConfig(opts.project);
    const entries = await readRecent(projectRoot, Number.parseInt(opts.limit, 10));
    if (entries.length === 0) {
      console.log("No audit entries yet.");
      return;
    }
    for (const entry of entries) {
      console.log(JSON.stringify(entry));
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(msg);
  process.exitCode = 1;
});
