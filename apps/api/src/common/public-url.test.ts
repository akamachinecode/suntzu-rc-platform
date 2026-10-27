import { describe, expect, it } from "vitest";
import { assertPublicUrl, isPrivateAddress } from "./public-url.js";

const INTERNAL = [
  "127.0.0.1",
  "10.1.2.3",
  "172.20.0.1",
  "192.168.1.1",
  "169.254.169.254",
  "169.254.170.2",
  "100.64.0.1",
  "0.0.0.0",
  "::",
  "::1",
  "fd00::1",
  "fe80::1",
  "fe80::1%en0",
  "::ffff:10.0.0.1",
  // The same addresses as the URL parser writes them: hex groups, not dotted.
  "::ffff:7f00:1",
  "::ffff:a9fe:a9fe",
  "::ffff:0a00:0005",
  "0:0:0:0:0:ffff:127.0.0.1",
  "::127.0.0.1",
  "64:ff9b::a9fe:a9fe",
  "not-an-ip",
];

const PUBLIC = [
  "8.8.8.8",
  "172.32.0.1",
  "2606:4700::6810:84e5",
  "::ffff:8.8.8.8",
  "::ffff:808:808",
];

describe("isPrivateAddress", () => {
  it("flags internal and metadata addresses, however they're written", () => {
    for (const address of INTERNAL) expect(isPrivateAddress(address), address).toBe(true);
  });

  it("lets public addresses through", () => {
    for (const address of PUBLIC) expect(isPrivateAddress(address), address).toBe(false);
  });
});

describe("assertPublicUrl", () => {
  it("refuses links that point inside", async () => {
    for (const url of [
      "http://169.254.169.254/latest/meta-data/",
      "http://127.0.0.1:3001/health",
      "http://[::1]/",
      "http://[::ffff:127.0.0.1]/",
      "http://[::ffff:a9fe:a9fe]/",
      "file:///etc/passwd",
      "https://user:pass@8.8.8.8/",
      "https://8.8.8.8:8443/",
    ]) {
      await expect(assertPublicUrl(url), url).rejects.toThrow();
    }
  });

  it("accepts a public address", async () => {
    await expect(assertPublicUrl("https://8.8.8.8/")).resolves.toBeInstanceOf(URL);
  });
});
