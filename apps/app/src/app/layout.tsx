import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { AccountButton } from "@/components/account/account-button";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";
import { PageEnd } from "@/components/page-end";
import { SiteSearch } from "@/components/search/site-search";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@workspace/ui/components/button";
import { Wordmark } from "@/components/wordmark";
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
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}: RC planes, helicopters and cars, taken apart`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
};

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
        {/* The first stop for keyboard users: past the header to the page itself. */}
        <a
          href="#content"
          className="fixed top-[calc(env(safe-area-inset-top)+0.5rem)] left-[calc(env(safe-area-inset-left)+0.5rem)] z-[60] -translate-y-[calc(100%+2rem+env(safe-area-inset-top))] rounded-md border-2 border-foreground bg-primary px-4 py-3 font-semibold shadow-hard-sm focus:translate-y-0"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-50 bg-background pt-[env(safe-area-inset-top)] pb-[var(--header-air)]">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-6">
            <Link
              href="/"
              aria-label={`${SITE.name} home`}
              className="flex h-11 shrink-0 items-center text-2xl xl:text-3xl"
            >
              <Wordmark />
            </Link>
            <MainNav />
            <div className="flex items-center gap-3">
              <SiteSearch />
              <AccountButton />
              <Button asChild className="max-lg:hidden">
                <Link href={SITE.cta.href}>{SITE.cta.label}</Link>
              </Button>
              <MobileNav />
            </div>
          </div>
        </header>
        <main id="content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter />
        <PageEnd />
      </body>
    </html>
  );
}
