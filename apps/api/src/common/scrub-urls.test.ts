import { describe, expect, it } from "vitest";
import { scrubUrl } from "./scrub-urls.js";

describe("scrubUrl", () => {
  it("keeps parameter names and drops their values", () => {
    expect(scrubUrl("http://api:3001/airspace?lat=25.7617&lng=-80.1918")).toBe(
      "http://api:3001/airspace?lat=[redacted]&lng=[redacted]",
    );
    expect(scrubUrl("/airspace?lat=25.7&lng=-80.1")).toBe(
      "/airspace?lat=[redacted]&lng=[redacted]",
    );
    expect(scrubUrl("lat=25.7&lng=-80.1")).toBe("lat=[redacted]&lng=[redacted]");
    expect(scrubUrl("/search?q=my+name#top")).toBe("/search?q=[redacted]#top");
  });

  it("hides a calendar feed's secret", () => {
    expect(scrubUrl("/calendar/abcDEF123_-abcDEF123_-xyz.ics")).toBe("/calendar/[secret].ics");
    expect(scrubUrl("http://api:3001/me/calendar/abcDEF123_-abcDEF123_-xyz.ics")).toBe(
      "http://api:3001/me/calendar/[secret].ics",
    );
  });

  it("leaves other URLs alone", () => {
    expect(scrubUrl("/events/jets-over-miami-2026")).toBe("/events/jets-over-miami-2026");
    expect(scrubUrl("https://tiles.openfreemap.org/styles/positron")).toBe(
      "https://tiles.openfreemap.org/styles/positron",
    );
  });
});

describe("ScrubUrls", () => {
  it("cleans a span's URL attributes before the exporter sees them", async () => {
    const { InMemorySpanExporter, SimpleSpanProcessor, TracerProvider } =
      await import("@opentelemetry/sdk-trace");
    const { ScrubUrls } = await import("./scrub-urls.js");
    const exporter = new InMemorySpanExporter();
    const provider = new TracerProvider({
      spanProcessors: [new ScrubUrls(), new SimpleSpanProcessor({ exporter })],
    });
    const span = provider.getTracer("test").startSpan("GET");
    span.setAttribute("url.full", "http://api:3001/me/calendar/abcDEF123_-abcDEF123_-xyz.ics");
    span.setAttribute("http.target", "/airspace?lat=25.7&lng=-80.1");
    span.setAttribute("http.method", "GET");
    span.end();
    const [exported] = exporter.getFinishedSpans();
    expect(exported?.attributes).toEqual({
      "url.full": "http://api:3001/me/calendar/[secret].ics",
      "http.target": "/airspace?lat=[redacted]&lng=[redacted]",
      "http.method": "GET",
    });
  });
});
