import { appendAudit } from "../../audit/log.js";
import type { SelfHealConfig } from "../../config/schema.js";
import { LLMClient } from "../../llm/client.js";
import { dispatchNotification } from "../../notifications/dispatcher.js";
import { retrieveRelevantSnippets } from "../retrieval/retriever.js";
import { applyPatch, extractDiffFromResponse, listTouchedPaths, validatePatch } from "./diff.js";

export interface HealResult {
  ok: boolean;
  message: string;
  diff?: string;
  touchedPaths?: string[];
}

function makePrompt(tracebackText: string, snippets: Array<{ path: string; content: string }>): string {
  const refs = snippets
    .map((item) => `FILE: ${item.path}\n${item.content}`)
    .join("\n\n---\n\n");
  return [
    "You are a coding assistant that must return ONLY a valid unified git diff.",
    "Hard rules:",
    "1) Output plain text diff only. No markdown fences. No explanations. No headings.",
    "2) Start with: diff --git a/<path> b/<path>.",
    "3) Include proper file headers: --- a/<path> and +++ b/<path> (or /dev/null).",
    "4) Include at least one hunk header: @@ ... @@.",
    "5) Patch must be directly applicable with: git apply -",
    "6) Do not touch files outside provided context unless strictly necessary.",
    "7) Never output non-diff text before or after the patch.",
    "Traceback:",
    tracebackText,
    "Relevant files:",
    refs
  ].join("\n\n");
}

export async function healFromTraceback(
  projectRoot: string,
  tracebackText: string,
  config: SelfHealConfig,
  client: LLMClient,
  mode: "suggest" | "apply",
  dryRun: boolean
): Promise<HealResult> {
  await appendAudit(projectRoot, {
    event: "error_captured",
    timestamp: new Date().toISOString()
  });

  await dispatchNotification(projectRoot, config, {
    event: "error_captured",
    traceback: tracebackText
  });

  const snippets = await retrieveRelevantSnippets(projectRoot, config, tracebackText);
  const response = await client.chat(makePrompt(tracebackText, snippets));
  const diff = extractDiffFromResponse(response);
  if (!diff) {
    await appendAudit(projectRoot, {
      event: "heal_empty_diff",
      timestamp: new Date().toISOString()
    });
    return { ok: false, message: "Model returned no valid diff." };
  }

  const validation = validatePatch(diff, config);
  if (!validation.ok) {
    await appendAudit(projectRoot, {
      event: "heal_diff_rejected",
      timestamp: new Date().toISOString(),
      data: { reason: validation.reason }
    });
    return { ok: false, message: validation.reason ?? "Patch rejected by policy." };
  }

  const touched = listTouchedPaths(diff);
  await dispatchNotification(projectRoot, config, {
    event: "heal_diff_proposed",
    traceback: tracebackText,
    diff,
    paths: touched
  });

  if (mode === "suggest" || dryRun) {
    await appendAudit(projectRoot, {
      event: "heal_diff_proposed",
      timestamp: new Date().toISOString(),
      data: { paths: touched }
    });
    return { ok: true, message: "Patch generated (dry-run).", diff, touchedPaths: touched };
  }

  try {
    await applyPatch(projectRoot, diff);
    await appendAudit(projectRoot, {
      event: "heal_applied",
      timestamp: new Date().toISOString(),
      data: { paths: touched }
    });
    await dispatchNotification(projectRoot, config, {
      event: "heal_applied",
      traceback: tracebackText,
      diff,
      paths: touched
    });
    return { ok: true, message: "Patch applied.", diff, touchedPaths: touched };
  } catch (error) {
    await appendAudit(projectRoot, {
      event: "heal_apply_failed",
      timestamp: new Date().toISOString(),
      data: { error: error instanceof Error ? error.message : String(error) }
    });
    await dispatchNotification(projectRoot, config, {
      event: "heal_apply_failed",
      traceback: tracebackText,
      diff,
      paths: touched
    });
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to apply patch.",
      diff,
      touchedPaths: touched
    };
  }
}
