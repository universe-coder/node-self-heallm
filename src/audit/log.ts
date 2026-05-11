import fs from "node:fs/promises";
import path from "node:path";

const AUDIT_DIR = ".self-heal";
const AUDIT_FILE = "audit.jsonl";

export interface AuditEvent {
  event: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

function auditFilePath(projectRoot: string): string {
  return path.join(projectRoot, AUDIT_DIR, AUDIT_FILE);
}

export async function appendAudit(projectRoot: string, event: AuditEvent): Promise<void> {
  const filePath = auditFilePath(projectRoot);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(event)}\n`, "utf8");
}

export async function readRecent(projectRoot: string, limit = 15): Promise<AuditEvent[]> {
  try {
    const raw = await fs.readFile(auditFilePath(projectRoot), "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines
      .slice(-limit)
      .map((line) => JSON.parse(line) as AuditEvent)
      .filter((entry) => entry?.event && entry?.timestamp);
  } catch {
    return [];
  }
}
