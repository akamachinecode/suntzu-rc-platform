import { env } from "@/lib/env";

// "Add to calendar" for one event: an .ics file relayed from the API, offered as a download.
export async function GET(_request: Request, ctx: RouteContext<"/events/[slug]/calendar.ics">) {
  const { slug } = await ctx.params;
  const response = await fetch(`${env.API_URL}/events/${encodeURIComponent(slug)}/calendar.ics`, {
    next: { revalidate: 300 },
  });
  if (!response.ok) return new Response("Not found", { status: 404 });
  return new Response(await response.text(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
