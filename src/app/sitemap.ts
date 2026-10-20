import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Public pages only. Add new public routes here.
const ROUTES = [
  "/",
  "/learn",
  "/events",
  "/community",
  "/guides",
  "/guides/rc-planes",
  "/guides/flying-legally",
  "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((path) => ({ url: new URL(path, SITE.url).toString() }));
}
