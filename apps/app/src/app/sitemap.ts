import type { MetadataRoute } from "next";
import { getPublicApi } from "@/lib/api";
import { SITE } from "@/lib/site";

// Public pages only. Add new public routes here.
const ROUTES = [
  "/",
  "/learn",
  "/events",
  "/community",
  "/guides",
  "/guides/rc-planes",
  "/guides/rc-helicopters",
  "/guides/cars-and-crawlers",
  "/guides/flying-legally",
  "/contact",
];

// Rebuilt hourly; if the API is down (or during the build) the event pages are left out until then.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ROUTES.map((path) => ({ url: new URL(path, SITE.url).toString() }));
  const { data: events } = await getPublicApi()
    .GET("/events")
    .catch(() => ({ data: undefined }));
  const eventPages = (events ?? []).map((event) => ({
    url: new URL(`/events/${event.slug}`, SITE.url).toString(),
    lastModified: event.updatedAt,
  }));
  return [...pages, ...eventPages];
}
