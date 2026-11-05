import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Links that people give us (a submitted event page, a club's website) are fetched from inside
// our network. These checks keep those requests on the public internet: no internal addresses,
// no cloud metadata endpoints, no odd ports, every redirect checked again, and a size limit.

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

/** The eight 16-bit groups of an IPv6 address, with "::" and a trailing IPv4 part expanded. */
function expandV6(address: string): number[] | undefined {
  let text = address.replace(/%.*$/, "");
  const v4 = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const [a, b, c, d] = v4[1]!.split(".").map(Number) as [number, number, number, number];
    text = `${text.slice(0, -v4[1]!.length)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const parts = text.split("::");
  if (parts.length > 2) return undefined;
  const left = parts[0] ? parts[0].split(":") : [];
  const right = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  const missing = parts.length === 2 ? 8 - left.length - right.length : 0;
  if (missing < 0) return undefined;
  const groups = [...left, ...Array<string>(missing).fill("0"), ...right].map((group) =>
    /^[0-9a-f]{1,4}$/.test(group) ? parseInt(group, 16) : -1,
  );
  return groups.length === 8 && groups.every((group) => group >= 0) ? groups : undefined;
}

/**
 * True for loopback, private, link-local and other non-public addresses (IPv4 and IPv6). IPv6
 * forms that carry an IPv4 address (mapped `::ffff:7f00:1`, compatible `::127.0.0.1`, NAT64
 * `64:ff9b::…`) are judged by the IPv4 address inside them, however they're written.
 */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) return privateV4(address);
  if (isIP(address.replace(/%.*$/, "")) !== 6) return true;
  const groups = expandV6(address.toLowerCase());
  if (!groups) return true;
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const embedded = `${g6 >> 8}.${g6 & 255}.${g7 >> 8}.${g7 & 255}`;
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && (g5 === 0 || g5 === 0xffff)) {
    // :: and ::1, or an IPv4 address mapped (::ffff:) or compatible (::) inside IPv6.
    return (g5 === 0 && g6 === 0 && g7 <= 1) || privateV4(embedded);
  }
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return privateV4(embedded); // NAT64
  }
  return (
    (g0 & 0xfe00) === 0xfc00 || // fc00::/7 unique local
    (g0 & 0xffc0) === 0xfe80 || // fe80::/10 link-local
    (g0 & 0xff00) === 0xff00 || // ff00::/8 multicast
    (g0 === 0x2001 && g1 < 0x200) // 2001::/23 special purpose (Teredo, documentation…)
  );
}

/** Throws unless the URL is http(s) on the usual ports and every address it resolves to is public. */
export async function assertPublicUrl(raw: string | URL): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UnsafeUrlError("Only web links");
  }
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

const MAX_BYTES = 2_000_000;

/**
 * `fetch` that only talks to public addresses, checks every redirect before following it, and
 * reads at most 2 MB of the answer (a page that never ends can't fill the API's memory).
 */
export async function publicFetch(
  input: string | URL | Request,
  init: RequestInit = {},
): Promise<Response> {
  let url = await assertPublicUrl(input instanceof Request ? input.url : input);
  for (let hop = 0; hop < 5; hop++) {
    const response = await fetch(url, { ...init, redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) {
      const body = response.status === 304 ? null : await readLimited(response);
      const limited = new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      Object.defineProperty(limited, "url", { value: url.toString() });
      return limited;
    }
    await response.body?.cancel();
    url = await assertPublicUrl(new URL(location, url));
  }
  throw new UnsafeUrlError("Too many redirects");
}

async function readLimited(response: Response): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new UnsafeUrlError("The page is too large");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
