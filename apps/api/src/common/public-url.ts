import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Links that people give us (a submitted event page, a club's website) are fetched from inside
// our network. These checks keep those requests on the public internet: no internal addresses,
// no cloud metadata endpoints, no odd ports, and every redirect checked again.

export class UnsafeUrlError extends Error {}

const PRIVATE_V4: [number, number][] = [
  [0x00000000, 8], // 0.0.0.0/8
  [0x0a000000, 8], // 10.0.0.0/8
  [0x64400000, 10], // 100.64.0.0/10 (carrier-grade NAT)
  [0x7f000000, 8], // 127.0.0.0/8
  [0xa9fe0000, 16], // 169.254.0.0/16 (link-local, cloud metadata)
  [0xac100000, 12], // 172.16.0.0/12
  [0xc0000000, 24], // 192.0.0.0/24
  [0xc0a80000, 16], // 192.168.0.0/16
  [0xc6120000, 15], // 198.18.0.0/15
  [0xe0000000, 3], // 224.0.0.0/3 (multicast, reserved)
];

function privateV4(address: string): boolean {
  const value = address.split(".").reduce((sum, part) => sum * 256 + Number(part), 0);
  return PRIVATE_V4.some(([base, bits]) => value >>> (32 - bits) === base >>> (32 - bits));
}

/** True for loopback, private, link-local and other non-public addresses (IPv4 and IPv6). */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) return privateV4(address);
  const lower = address.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return privateV4(mapped[1]!);
  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    /^fe[89ab]/.test(lower) ||
    lower.startsWith("ff")
  );
}

/** Throws unless the URL is http(s) on the usual ports and every address it resolves to is public. */
export async function assertPublicUrl(raw: string | URL): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new UnsafeUrlError("Only web links");
  if (url.username || url.password) throw new UnsafeUrlError("No credentials in links");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UnsafeUrlError("Unusual port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((entry) => entry.address);
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new UnsafeUrlError("Not a public address");
  }
  return url;
}

/** `fetch` that only talks to public addresses and checks every redirect before following it. */
export async function publicFetch(
  input: string | URL | Request,
  init: RequestInit = {},
): Promise<Response> {
  let url = await assertPublicUrl(input instanceof Request ? input.url : input);
  for (let hop = 0; hop < 5; hop++) {
    const response = await fetch(url, { ...init, redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) return response;
    url = await assertPublicUrl(new URL(location, url));
  }
  throw new UnsafeUrlError("Too many redirects");
}
