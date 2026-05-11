import crypto from "node:crypto";

import { appendAudit } from "../audit/log.js";
import { requireEnv } from "../config/loadConfig.js";
import type { SelfHealConfig } from "../config/schema.js";
import { postJson } from "./httpUtil.js";
import { redactEvent } from "./redact.js";
import type { NotificationEvent } from "./types.js";
import { validateHttpTarget } from "./urlValidate.js";

const allowedEvents = new Set<NotificationEvent["event"]>([
  "error_captured",
  "heal_diff_proposed",
  "heal_applied",
  "heal_apply_failed"
]);

async function sendWebhook(config: SelfHealConfig, event: NotificationEvent): Promise<void> {
  if (!config.notifications.webhook.enabled) {
    return;
  }
  const url = requireEnv(config.notifications.webhook.urlEnv);
  await validateHttpTarget(url, config.notifications.allowInsecure);
  const timestamp = `${Math.floor(Date.now() / 1000)}`;
  const payload = JSON.stringify(event);
  const secret = process.env[config.notifications.webhook.signingSecretEnv]?.trim();
  const signature = secret
    ? crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")
    : "";
  await postJson(url, event, {
    "x-selfheal-timestamp": timestamp,
    "x-selfheal-signature": signature ? `sha256=${signature}` : ""
  });
}

async function sendSlack(config: SelfHealConfig, event: NotificationEvent): Promise<void> {
  if (!config.notifications.slack.enabled) {
    return;
  }
  const url = requireEnv(config.notifications.slack.webhookEnv);
  await validateHttpTarget(url, config.notifications.allowInsecure);
  await postJson(url, {
    text: `[self-heal] ${event.event}`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*Event:* \`${event.event}\`` } },
      { type: "section", text: { type: "mrkdwn", text: (event.traceback ?? "").slice(0, 800) || "N/A" } }
    ]
  });
}

async function sendTelegram(config: SelfHealConfig, event: NotificationEvent): Promise<void> {
  if (!config.notifications.telegram.enabled) {
    return;
  }
  const token = requireEnv(config.notifications.telegram.botTokenEnv);
  const chatId = requireEnv(config.notifications.telegram.chatIdEnv);
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await postJson(url, {
    chat_id: chatId,
    text: `<b>self-heal</b> ${event.event}\n<pre>${(event.traceback ?? "N/A").slice(0, 1000)}</pre>`,
    parse_mode: "HTML"
  });
}

async function sendSentry(config: SelfHealConfig, event: NotificationEvent): Promise<void> {
  if (!config.notifications.sentry.enabled) {
    return;
  }
  const dsn = requireEnv(config.notifications.sentry.dsnEnv);
  const sentry = await import("@sentry/node");
  if (!sentry.getClient()) {
    sentry.init({ dsn });
  }
  if (event.event === "error_captured" && event.traceback) {
    sentry.captureException(new Error(event.traceback.slice(0, 1000)));
  } else {
    sentry.captureMessage(`self-heal event: ${event.event}`);
  }
}

export async function dispatchNotification(
  projectRoot: string,
  config: SelfHealConfig,
  event: NotificationEvent
): Promise<void> {
  if (!config.notifications.enabled || !allowedEvents.has(event.event)) {
    return;
  }
  const redacted = redactEvent(config, event);
  const channels = [
    sendWebhook(config, redacted),
    sendSlack(config, redacted),
    sendTelegram(config, redacted),
    sendSentry(config, redacted)
  ];

  const settled = await Promise.allSettled(channels);
  for (const result of settled) {
    if (result.status === "fulfilled") {
      await appendAudit(projectRoot, {
        event: "notification_sent",
        timestamp: new Date().toISOString(),
        data: { channelStatus: "ok", sourceEvent: event.event }
      });
    } else {
      await appendAudit(projectRoot, {
        event: "notification_failed",
        timestamp: new Date().toISOString(),
        data: {
          sourceEvent: event.event,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason)
        }
      });
    }
  }
}
