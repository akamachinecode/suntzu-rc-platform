import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Public pages only. Add new public routes here.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/contact"].map((path) => ({ url: new URL(path, SITE.url).toString() }));
}
