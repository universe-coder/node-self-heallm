import { sanitizeText } from "./sanitize.js";

export interface ErrorEvent {
  name: string;
  message: string;
  stack: string;
}

export function captureError(error: unknown): ErrorEvent {
  if (error instanceof Error) {
    return {
      name: sanitizeText(error.name),
      message: sanitizeText(error.message),
      stack: sanitizeText(error.stack ?? `${error.name}: ${error.message}`)
    };
  }
  const raw = sanitizeText(String(error));
  return { name: "UnknownError", message: raw, stack: raw };
}
