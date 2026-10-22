import { env } from "@/lib/env";

// The calendar feed people subscribe to (webcal://…/events/calendar.ics?discipline=air): a route
// handler because its callers are calendar apps, not browsers. It relays the API's feed so the
// public URL stays on the site's own domain.
export async function GET(request: Request) {
  const { search } = new URL(request.url);
  const response = await fetch(`${env.API_URL}/events/calendar.ics${search}`, {
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
