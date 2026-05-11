import type { SelfHealConfig } from "../config/schema.js";
import type { NotificationEvent } from "./types.js";

function truncateLines(input: string, maxLines: number): string {
  return input.split("\n").slice(0, maxLines).join("\n");
}

export function redactEvent(config: SelfHealConfig, event: NotificationEvent): NotificationEvent {
  return {
    ...event,
    traceback:
      config.notifications.includeTraceback && event.traceback
        ? truncateLines(event.traceback, config.notifications.maxTracebackLines)
        : undefined,
    diff: config.notifications.includeDiff ? event.diff : undefined
  };
}
