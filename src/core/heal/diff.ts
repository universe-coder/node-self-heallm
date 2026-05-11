import { spawn } from "node:child_process";

import type { SelfHealConfig } from "../../config/schema.js";
import { isPathAllowed } from "./policy.js";

export function extractDiffFromResponse(response: string): string | null {
  const marker = "diff --git";
  const markerIndex = response.indexOf(marker);
  if (markerIndex >= 0) {
    return response.slice(markerIndex).trim();
  }
  const fencedMatch = response.match(/```diff\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }
  return null;
}

export function listTouchedPaths(diffText: string): string[] {
  const matches = [...diffText.matchAll(/^\+\+\+\s+b\/(.+)$/gm)];
  return matches.map((m) => m[1]).filter(Boolean);
}

export function validatePatch(diffText: string, config: SelfHealConfig): { ok: boolean; reason?: string } {
  const lines = diffText.split("\n");
  if (lines.length > config.heal.maxPatchLines) {
    return { ok: false, reason: "Patch exceeds maxPatchLines limit." };
  }
  const touched = listTouchedPaths(diffText);
  if (touched.length === 0) {
    return { ok: false, reason: "Patch touches no files." };
  }
  for (const filePath of touched) {
    if (!isPathAllowed(filePath, config.heal.allowedPaths, config.heal.forbiddenPaths)) {
      return { ok: false, reason: `Path not allowed by policy: ${filePath}` };
    }
  }
  return { ok: true };
}

export async function applyPatch(projectRoot: string, diffText: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("git", ["apply", "--whitespace=nowarn", "-"], {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString("utf8");
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`git apply failed (${code}): ${stderr}`));
      }
    });
    proc.stdin.write(diffText);
    proc.stdin.end();
  });
}
