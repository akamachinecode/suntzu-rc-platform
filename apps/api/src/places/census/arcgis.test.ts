import { describe, expect, it } from "vitest";
import { queryAll, queryUrl } from "./arcgis.js";
import { CensusHttp } from "./http.js";

function fakeHttp(pages: unknown[]) {
  const urls: string[] = [];
  const responses = [...pages];
  const http = new CensusHttp({
    pauseMs: 0,
    sleep: async () => {},
    fetch: async (input) => {
      urls.push(String(input));
      const body = responses.shift();
      return new Response(JSON.stringify(body), { status: 200 });
    },
  });
  return { http, urls };
}

const feature = (id: number) => ({ attributes: { id } });

describe("queryAll", () => {
  it("pages through results with resultOffset", async () => {
    const { http, urls } = fakeHttp([
      { features: [feature(1), feature(2)], exceededTransferLimit: true },
      { features: [feature(3)] },
    ]);
    const features = await queryAll(
      http,
      "https://example.test/FeatureServer/0",
      { where: "1=1" },
      2,
    );
    expect(features.map((f) => f.attributes.id)).toEqual([1, 2, 3]);
    expect(urls.map((url) => new URL(url).searchParams.get("resultOffset"))).toEqual(["0", "2"]);
    const first = new URL(urls[0]!);
    expect(first.pathname).toBe("/FeatureServer/0/query");
    expect(first.searchParams.get("outSR")).toBe("4326");
    expect(first.searchParams.get("f")).toBe("json");
  });

  it("stops on an ArcGIS error", async () => {
    const { http } = fakeHttp([{ error: { code: 400, message: "Invalid query" } }]);
    await expect(queryAll(http, "https://example.test/FeatureServer/0", {})).rejects.toThrow(
      /Invalid query/,
    );
  });
});

describe("CensusHttp", () => {
  it("says who it is and retries a busy server", async () => {
    const agents: string[] = [];
    let calls = 0;
    const http = new CensusHttp({
      pauseMs: 0,
      sleep: async () => {},
      fetch: async (_input, init) => {
        agents.push(new Headers(init?.headers).get("user-agent") ?? "");
        calls++;
        return calls === 1
          ? new Response("busy", { status: 503 })
          : new Response("{}", { status: 200 });
      },
    });
    await expect(http.json("https://example.test/a")).resolves.toEqual({});
    expect(calls).toBe(2);
    expect(agents[0]).toMatch(/^ServoBot\//);
  });

  it("doesn't retry a missing file", async () => {
    let calls = 0;
    const http = new CensusHttp({
      pauseMs: 0,
      sleep: async () => {},
      fetch: async () => {
        calls++;
        return new Response("", { status: 404 });
      },
    });
    await expect(http.bytes("https://example.test/missing.zip")).rejects.toThrow(/HTTP 404/);
    expect(calls).toBe(1);
  });
});

it("builds query URLs", () => {
  expect(queryUrl("https://example.test/FeatureServer/0", { where: "STATE='FL'" })).toBe(
    "https://example.test/FeatureServer/0/query?f=json&outSR=4326&where=STATE%3D%27FL%27",
  );
});
