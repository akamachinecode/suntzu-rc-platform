import { describe, expect, it } from "vitest";
import { assertPublicUrl, isPrivateAddress } from "./public-url.js";

describe("isPrivateAddress", () => {
  it("flags internal and metadata addresses", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.20.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "169.254.170.2",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:10.0.0.1",
    ]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
  });

  it("lets public addresses through", () => {
    for (const address of ["8.8.8.8", "172.32.0.1", "2606:4700::6810:84e5", "::ffff:8.8.8.8"]) {
      expect(isPrivateAddress(address), address).toBe(false);
    }
  });
});

describe("assertPublicUrl", () => {
  it("refuses links that point inside", async () => {
    await expect(assertPublicUrl("http://169.254.169.254/latest/meta-data/")).rejects.toThrow();
    await expect(assertPublicUrl("http://127.0.0.1:3001/health")).rejects.toThrow();
    await expect(assertPublicUrl("http://[::1]/")).rejects.toThrow();
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow();
    await expect(assertPublicUrl("https://user:pass@8.8.8.8/")).rejects.toThrow();
    await expect(assertPublicUrl("https://8.8.8.8:8443/")).rejects.toThrow();
  });

  it("accepts a public address", async () => {
    await expect(assertPublicUrl("https://8.8.8.8/")).resolves.toBeInstanceOf(URL);
  });
});
