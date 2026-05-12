import { spawn } from "node:child_process";

import type { SelfHealConfig } from "../../config/schema.js";
import { isPathAllowed } from "./policy.js";

const FILE_START_RE = /^(diff --git a\/.+ b\/.+|--- (a\/.+|\/dev\/null))$/;
const META_RE =
  /^(diff --git a\/.+ b\/.+|index [0-9a-f]+\.\.[0-9a-f]+(?: \d{6})?|--- (a\/.+|\/dev\/null)|\+\+\+ (b\/.+|\/dev\/null)|new file mode \d{6}|deleted file mode \d{6}|similarity index \d+%|rename from .+|rename to .+|old mode \d{6}|new mode \d{6}|Binary files .+ and .+ differ|GIT binary patch)$/;

function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/^\uFEFF/, "");
}

function sanitizeExtractedDiff(raw: string): string | null {
  const lines = normalizeLineEndings(raw).split("\n");
  const start = lines.findIndex((line) => FILE_START_RE.test(line.trim()));
  if (start < 0) {
    return null;
  }

  const out: string[] = [];
  let inHunk = false;
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "```") {
      break;
    }
    if (trimmed.startsWith("diff --git ")) {
      inHunk = false;
      out.push(trimmed);
      continue;
    }
    if (META_RE.test(trimmed)) {
      out.push(trimmed);
      continue;
    }
    if (trimmed.startsWith("@@")) {
      inHunk = true;
      out.push(line);
      continue;
    }
    if (inHunk && (/^[ +-].*/.test(line) || line === "\\ No newline at end of file")) {
      out.push(line);
      continue;
    }
    if (trimmed.length === 0) {
      continue;
    }
    break;
  }

  const candidate = out.join("\n").trim();
  return candidate.length > 0 ? candidate : null;
}

export function extractDiffFromResponse(response: string): string | null {
  const normalized = normalizeLineEndings(response).trim();
  const fencedMatch = normalized.match(/```diff\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return sanitizeExtractedDiff(fencedMatch[1]);
  }
  const markerIndex = normalized.indexOf("diff --git ");
  if (markerIndex >= 0) {
    return sanitizeExtractedDiff(normalized.slice(markerIndex));
  }
  const unifiedIndex = normalized.search(/^--- (a\/.+|\/dev\/null)$/m);
  if (unifiedIndex >= 0) {
    return sanitizeExtractedDiff(normalized.slice(unifiedIndex));
  }
  return sanitizeExtractedDiff(normalized);
}

export function listTouchedPaths(diffText: string): string[] {
  const matches = [...diffText.matchAll(/^\+\+\+\s+b\/(.+)$/gm)];
  return matches.map((m) => m[1]).filter(Boolean);
}

export function validatePatch(diffText: string, config: SelfHealConfig): { ok: boolean; reason?: string } {
  const lines = diffText.split("\n");
  if (!lines.some((line) => line.startsWith("diff --git "))) {
    return { ok: false, reason: "Patch must start with git unified diff headers." };
  }
  if (!lines.some((line) => line.startsWith("@@"))) {
    return { ok: false, reason: "Patch contains no hunks." };
  }
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
