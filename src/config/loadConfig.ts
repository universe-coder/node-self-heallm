import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { parse } from "@iarna/toml";
import { config as loadDotenv } from "dotenv";

import { DEFAULT_CONFIG_FILE } from "./defaultConfigTemplate.js";
import { defaultConfig, type SelfHealConfig } from "./schema.js";

loadDotenv();

export interface ConfigWithRoot {
  config: SelfHealConfig;
  projectRoot: string;
}

async function findConfig(startDir: string): Promise<string | null> {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, DEFAULT_CONFIG_FILE);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // continue
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export async function loadConfig(project?: string): Promise<ConfigWithRoot> {
  const startDir = project ? path.resolve(project) : process.cwd();
  const found = await findConfig(startDir);
  const projectRoot = found ? path.dirname(found) : startDir;

  let parsedUnknown: unknown = {};
  if (found) {
    const raw = await fs.readFile(found, "utf8");
    parsedUnknown = parse(raw);
  }

  const parsed = (parsedUnknown ?? {}) as Record<string, unknown>;
  const llm = (parsed.llm ?? {}) as Record<string, unknown>;
  const index = (parsed.index ?? {}) as Record<string, unknown>;
  const heal = (parsed.heal ?? {}) as Record<string, unknown>;
  const supervisor = (parsed.supervisor ?? {}) as Record<string, unknown>;
  const notifications = (parsed.notifications ?? {}) as Record<string, unknown>;
  const webhook = (notifications.webhook ?? {}) as Record<string, unknown>;
  const slack = (notifications.slack ?? {}) as Record<string, unknown>;
  const telegram = (notifications.telegram ?? {}) as Record<string, unknown>;
  const sentry = (notifications.sentry ?? {}) as Record<string, unknown>;

  const config: SelfHealConfig = {
    llm: { ...defaultConfig.llm, ...llm },
    index: { ...defaultConfig.index, ...index },
    heal: { ...defaultConfig.heal, ...heal },
    supervisor: { ...defaultConfig.supervisor, ...supervisor },
    notifications: {
      ...defaultConfig.notifications,
      ...notifications,
      webhook: { ...defaultConfig.notifications.webhook, ...webhook },
      slack: { ...defaultConfig.notifications.slack, ...slack },
      telegram: { ...defaultConfig.notifications.telegram, ...telegram },
      sentry: { ...defaultConfig.notifications.sentry, ...sentry }
    }
  };
  return { config, projectRoot };
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
