const SENSITIVE_PATTERNS = [
  /api[_-]?key/gi,
  /token/gi,
  /password/gi,
  /secret/gi,
  /authorization/gi,
  /bearer\s+[a-z0-9\-._~+/]+=*/gi
];

export function sanitizeText(input: string): string {
  let output = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    output = output.replace(pattern, "[REDACTED]");
  }
  return output;
}
