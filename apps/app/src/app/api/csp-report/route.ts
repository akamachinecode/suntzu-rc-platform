// Where browsers report what the Content-Security-Policy would have blocked (report-only for now,
// spec 0010): one JSON log line per report, `level: "warn"` so the error alarm doesn't count them.
// Logs Insights: filter msg = "csp-violation" | stats count(*) by directive, blocked.
// Only what's needed to fix the policy is kept: the directive, the blocked origin (or "inline",
// "eval"), the page's path. No full URLs, no code samples, no IP address.

const MAX_BYTES = 16_384;

type Report = Record<string, unknown>;

function origin(value: unknown): string {
  if (typeof value !== "string" || !value) return "unknown";
  if (!value.includes(":")) return value; // "inline", "eval", "self"
  try {
    return new URL(value).origin;
  } catch {
    return value.split(":")[0] ?? "unknown";
  }
}

function path(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  try {
    return new URL(value).pathname;
  } catch {
    return "unknown";
  }
}

/** The violations in a report, whichever format the browser used. */
function violations(body: unknown): Report[] {
  // Reporting API (Chrome, Edge, Safari): [{ type: "csp-violation", body: {...} }]
  if (Array.isArray(body)) {
    return body
      .filter((item: Report) => item?.type === "csp-violation" && typeof item.body === "object")
      .map((item: Report) => item.body as Report);
  }
  // report-uri (Firefox): { "csp-report": {...} }, with dashed keys.
  const legacy = (body as Report | null)?.["csp-report"] as Report | undefined;
  if (!legacy) return [];
  return [
    {
      effectiveDirective: legacy["effective-directive"] ?? legacy["violated-directive"],
      blockedURL: legacy["blocked-uri"],
      documentURL: legacy["document-uri"],
    },
  ];
}

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BYTES) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  for (const report of violations(body).slice(0, 20)) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "csp-violation",
        directive: String(report.effectiveDirective ?? "unknown").slice(0, 40),
        blocked: origin(report.blockedURL).slice(0, 120),
        page: path(report.documentURL).slice(0, 200),
      }),
    );
  }
  return new Response(null, { status: 204 });
}
