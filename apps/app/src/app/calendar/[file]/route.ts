import { env } from "@/lib/env";

// A member's private calendar feed (/calendar/<secret>.ics): relays the API so the URL people
// paste into their calendar app stays on the site's own domain. The secret is the only key.
export async function GET(_request: Request, { params }: RouteContext<"/calendar/[file]">) {
  const { file } = await params;
  if (!/^[\w-]{20,64}\.ics$/.test(file)) return new Response("Not found", { status: 404 });
  const response = await fetch(`${env.API_URL}/me/calendar/${file}`, { cache: "no-store" });
  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "text/plain; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
