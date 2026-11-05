import type { MetadataRoute } from "next";
import { getPublicApi } from "@/lib/api";
import { SITE } from "@/lib/site";

// Public pages only. Add new public routes here.
const ROUTES = [
  "/",
  "/learn",
  "/events",
  "/places",
  "/places/can-i-fly-here",
  "/clubs",
  "/community",
  "/try",
  "/submit",
  "/organise",
  "/privacy",
  "/terms",
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
  const [{ data: places }, { data: hosts }] = await Promise.all([
    getPublicApi()
      .GET("/places")
      .catch(() => ({ data: undefined })),
    getPublicApi()
      .GET("/hosts")
      .catch(() => ({ data: undefined })),
  ]);
  const placePages = (places ?? []).map((place) => ({
    url: new URL(`/places/${place.slug}`, SITE.url).toString(),
    ...(place.verifiedAt && { lastModified: place.verifiedAt }),
  }));
  const hostPages = (hosts ?? []).map((host) => ({
    url: new URL(`/clubs/${host.slug}`, SITE.url).toString(),
  }));
  return [...pages, ...eventPages, ...placePages, ...hostPages];
}
