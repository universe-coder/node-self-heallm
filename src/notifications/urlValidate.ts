import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIpv4(ip: string): boolean {
  return (
    ip.startsWith("10.") ||
    ip.startsWith("127.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function isPrivateIpv6(ip: string): boolean {
  return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80");
}

export async function validateHttpTarget(url: string, allowInsecure: boolean): Promise<void> {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http(s) URLs are allowed.");
  }
  if (!allowInsecure && parsed.protocol !== "https:") {
    throw new Error("Only https URLs are allowed.");
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0") {
    throw new Error("Localhost targets are forbidden.");
  }
  const records = await dns.lookup(host, { all: true });
  for (const record of records) {
    if (net.isIP(record.address) === 4 && isPrivateIpv4(record.address)) {
      throw new Error("Private IPv4 targets are forbidden.");
    }
    if (net.isIP(record.address) === 6 && isPrivateIpv6(record.address.toLowerCase())) {
      throw new Error("Private IPv6 targets are forbidden.");
    }
  }
}
