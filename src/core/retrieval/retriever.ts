import fs from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type { SelfHealConfig } from "../../config/schema.js";

function scoreFile(tracebackText: string, content: string): number {
  const tbWords = new Set(tracebackText.toLowerCase().split(/\W+/).filter(Boolean));
  let score = 0;
  for (const word of tbWords) {
    if (word.length > 3 && content.toLowerCase().includes(word)) {
      score += 1;
    }
  }
  return score;
}

export async function retrieveRelevantSnippets(
  projectRoot: string,
  config: SelfHealConfig,
  tracebackText: string
): Promise<Array<{ path: string; content: string }>> {
  const files = await fg(config.index.include, {
    cwd: projectRoot,
    ignore: config.index.exclude,
    onlyFiles: true,
    absolute: true
  });
  const scored: Array<{ path: string; content: string; score: number }> = [];
  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    scored.push({
      path: path.relative(projectRoot, file),
      content,
      score: scoreFile(tracebackText, content)
    });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, config.index.topK)
    .map((item) => ({ path: item.path, content: item.content.slice(0, 2000) }));
}
