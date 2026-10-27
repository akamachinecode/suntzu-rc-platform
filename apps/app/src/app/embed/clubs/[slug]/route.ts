import { getPublicApi } from "@/lib/api";
import { formatWhen, formatWhere } from "@/lib/events";
import { SITE } from "@/lib/site";

// The organiser's widget (spec 0003): a small page clubs put on their own site with an iframe.
// It's plain HTML with its own few styles, because it lives inside someone else's page. The
// colours are the theme's values (it can't load the site's CSS variables there).
const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(_request: Request, { params }: RouteContext<"/embed/clubs/[slug]">) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return new Response("Not found", { status: 404 });
  const { data: host } = await getPublicApi().GET("/hosts/{slug}", { params: { path: { slug } } });
  if (!host) return new Response("Not found", { status: 404 });
  const page = (path: string) => new URL(path, SITE.url).toString();
  const items = host.events.slice(0, 8).map(
    (event) => `<li><a href="${page(`/events/${event.slug}`)}" target="_blank" rel="noopener">
      <span class="when${event.status === "cancelled" ? " off" : ""}">${escape(formatWhen(event))}</span>
      <span class="name">${escape(event.name)}${event.status === "cancelled" ? " · Cancelled" : ""}</span>
      <span class="where">${escape(formatWhere(event))}</span></a></li>`,
  );
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(host.name)} events</title><meta name="robots" content="noindex">
<style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#000;background:#fafaf7}
header{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 14px;border-bottom:2px solid #000;background:#ffc629}
h1{margin:0;font-size:16px;font-weight:800}a{color:inherit}ul{list-style:none;margin:0;padding:0}
li a{display:grid;gap:2px;padding:12px 14px;border-bottom:1px solid #00000022;text-decoration:none}li a:hover{background:#e4e4df}
.when{font-weight:800;font-size:14px}.off{text-decoration:line-through}.name{font-size:15px}.where{font-size:13px;color:#555}
footer{padding:10px 14px;font-size:12px}.empty{padding:14px}
</style></head><body>
<header><h1>${escape(host.name)}: upcoming</h1><a href="${page(`/clubs/${host.slug}`)}" target="_blank" rel="noopener" style="font-size:13px;font-weight:700">Follow on Servo</a></header>
${items.length ? `<ul>${items.join("")}</ul>` : `<p class="empty">No upcoming events yet.</p>`}
<footer>Calendar by <a href="${page("/")}" target="_blank" rel="noopener">Servo</a>, free for RC clubs in Florida.</footer>
</body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      // Meant to be framed by the club's own site.
      "Content-Security-Policy": "frame-ancestors *",
    },
  });
}
