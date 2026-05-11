export interface NotificationEvent {
  event: "error_captured" | "heal_diff_proposed" | "heal_applied" | "heal_apply_failed";
  traceback?: string;
  diff?: string;
  paths?: string[];
}
