import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * The web app manifest (spec 0010, slice 9): lets a visitor add SunTzu RC to their phone's home
 * screen, where it opens on its own, without the browser's bars. The `id` is stable, so the
 * installed app stays the same app if the start page ever changes (modern web guidance,
 * pwa/install-web-app). Icons: apps/app/public/icons, drawn by apps/app/scripts/draw-icons.ts.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    lang: SITE.lang,
    start_url: "/",
    scope: "/",
    display: "standalone",
    // The page's primer gray (--background) and XT60 yellow (--primary): a manifest can't read
    // the theme's CSS variables.
    background_color: "#e4e4df",
    theme_color: "#e4e4df",
    icons: [
      { src: "/icons/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/app-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
