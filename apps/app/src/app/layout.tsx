import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Cover the whole screen, so the footer's colour reaches the bottom edge behind an iPhone's
// toolbar and home indicator instead of a strip of page grey. The safe areas are padded below.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The design is light only: browsers draw their own controls light and don't darken the page.
  colorScheme: "only light",
  // The browser's bar in the page's primer gray (--background), on phones and installed.
  themeColor: "#e4e4df",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}: RC planes, helicopters and cars, taken apart`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  // The installable app's icons (app/manifest.ts); the favicon is app/favicon.ico.
  icons: {
    icon: [{ url: "/icons/app-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/icons/apple-touch-180.png", sizes: "180x180" }],
  },
};

// Root layout: <html>, fonts and metadata. The header and footer are in components/site-frame.tsx,
// used by (site)/layout.tsx (public pages), (app)/layout.tsx (private area) and not-found.tsx.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Native scrolling (no scroll library, see docs/DECISIONS.md, 2026-11-10). In-page links glide
    // unless the visitor asks for reduced motion; data-scroll-behavior keeps page changes instant.
    // scroll-padding keeps a section's heading clear of the sticky header when a link jumps to it.
    <html
      lang={SITE.lang}
      data-scroll-behavior="smooth"
      className={`${archivo.variable} scroll-pt-[var(--header)] scroll-smooth antialiased motion-reduce:scroll-auto`}
    >
      <body className="flex min-h-dvh flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        {children}
      </body>
    </html>
  );
}
