const STACK_START = /(?:Error|Exception|TypeError|ReferenceError|SyntaxError):/;

export function extractTraceback(stderr: string): string | null {
  const lines = stderr.split("\n");
  const startIndex = lines.findIndex((line) => STACK_START.test(line));
  if (startIndex < 0) {
    return null;
  }
  return lines.slice(startIndex).join("\n").trim();
}
