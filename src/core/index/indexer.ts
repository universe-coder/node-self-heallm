import fs from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import { appendAudit } from "../../audit/log.js";
import type { SelfHealConfig } from "../../config/schema.js";
import { LLMClient } from "../../llm/client.js";

function chunkContent(input: string, chunkSize = 1200): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < input.length; i += chunkSize) {
    chunks.push(input.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function runIndex(
  projectRoot: string,
  config: SelfHealConfig,
  client: LLMClient
): Promise<{ files: number; chunks: number }> {
  const files = await fg(config.index.include, {
    cwd: projectRoot,
    ignore: config.index.exclude,
    onlyFiles: true,
    absolute: true
  });
  const chunksToEmbed: string[] = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf8");
    const rel = path.relative(projectRoot, filePath);
    const chunks = chunkContent(content).map((chunk, idx) => `FILE:${rel}\nCHUNK:${idx}\n${chunk}`);
    chunksToEmbed.push(...chunks);
  }

  if (chunksToEmbed.length > 0) {
    await client.embed(chunksToEmbed);
  }

  await appendAudit(projectRoot, {
    event: "index_completed",
    timestamp: new Date().toISOString(),
    data: { files: files.length, chunks: chunksToEmbed.length }
  });

  return { files: files.length, chunks: chunksToEmbed.length };
}
