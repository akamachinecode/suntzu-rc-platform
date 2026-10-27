import { ImageResponse } from "next/og";
import { getPublicApi } from "@/lib/api";
import { DISCIPLINE_LABELS, formatWhen, formatWhere, KIND_LABELS } from "@/lib/events";
import { archivo } from "@/lib/og-font";

// The picture people see when an event is shared: a Servo pit pass. Images are drawn outside the
// page, so they can't use the theme's CSS variables: the colours below are the theme's values.
const INK = "#000000";
const PAPER = "#fafaf7";
const YELLOW = "#ffc629";

export const alt = "Event pass from Servo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: event } = await getPublicApi().GET("/events/{slug}", {
    params: { path: { slug } },
  });
  const name = event?.name ?? "RC events in Florida";
  const when = event ? formatWhen(event) : "Fly-ins, races and swap meets";
  const where = event ? formatWhere(event) : "servo";
  const tags = event
    ? [KIND_LABELS[event.kind].label, DISCIPLINE_LABELS[event.discipline]]
    : ["Planes", "Helicopters", "Cars", "FPV"];
  const cancelled = event?.status === "cancelled";
  const headline = `SERVO PIT PASS ${name} ${cancelled ? "Cancelled · " : ""}${when}`;
  const [heavy, regular] = await Promise.all([
    archivo(headline, { weight: 900, wide: true }),
    archivo(`${where} ${tags.join(" ")}`, { weight: 600, wide: false }),
  ]);
  const fonts = [
    ...(heavy ? [{ name: "Archivo Wide", data: heavy, weight: 900 as const }] : []),
    ...(regular ? [{ name: "Archivo", data: regular, weight: 600 as const }] : []),
  ];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: YELLOW,
        padding: 40,
        fontFamily: "Archivo, sans-serif",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          border: `6px solid ${INK}`,
          borderRadius: 28,
          boxShadow: `14px 14px 0 0 ${INK}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: INK,
            color: PAPER,
            padding: "18px 40px",
            fontSize: 30,
            fontFamily: "Archivo Wide",
            fontWeight: 900,
            letterSpacing: 6,
          }}
        >
          <span>SERVO</span>
          <span>PIT PASS</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "36px 40px", flex: 1 }}>
          <div style={{ display: "flex", gap: 14 }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: YELLOW,
                  border: `3px solid ${INK}`,
                  borderRadius: 10,
                  padding: "4px 14px",
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div
            style={{
              marginTop: 26,
              fontSize: name.length > 34 ? 60 : 80,
              fontFamily: "Archivo Wide",
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: -2,
              color: INK,
            }}
          >
            {name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 8 }}>
            <span
              style={{
                fontSize: 44,
                fontFamily: "Archivo Wide",
                fontWeight: 900,
                color: INK,
                textDecoration: cancelled ? "line-through" : "none",
              }}
            >
              {cancelled ? `Cancelled · ${when}` : when}
            </span>
            <span style={{ fontSize: 30, fontWeight: 600, color: INK }}>{where}</span>
          </div>
        </div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
