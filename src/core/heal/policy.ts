import path from "node:path";

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "::::DOUBLESTAR::::")
    .replace(/\*/g, "[^/]*")
    .replace(/::::DOUBLESTAR::::/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function matchesAny(target: string, patterns: string[]): boolean {
  return patterns.some((pattern) => globToRegExp(pattern).test(target));
}

export function isPathAllowed(
  filePath: string,
  allowedPaths: string[],
  forbiddenPaths: string[]
): boolean {
  const normalized = filePath.split(path.sep).join("/");
  return matchesAny(normalized, allowedPaths) && !matchesAny(normalized, forbiddenPaths);
}
