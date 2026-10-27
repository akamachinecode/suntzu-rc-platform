import { env } from "@/lib/env";

// A club's calendar feed (webcal://…/clubs/<slug>/calendar.ics), relayed from the API like the
// main feed so the URL people subscribe to stays on the site's own domain.
export async function GET(
  _request: Request,
  { params }: RouteContext<"/clubs/[slug]/calendar.ics">,
) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return new Response("Not found", { status: 404 });
  const response = await fetch(`${env.API_URL}/events/calendar.ics?host=${slug}`, {
    next: { revalidate: 300 },
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
