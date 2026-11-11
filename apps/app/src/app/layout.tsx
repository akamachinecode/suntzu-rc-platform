import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { AccountButton } from "@/components/account/account-button";
import { MobileNav } from "@/components/mobile-nav";
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
    <html
      lang={SITE.lang}
      data-scroll-behavior="smooth"
      className={`${archivo.variable} scroll-smooth antialiased motion-reduce:scroll-auto`}
    >
      <body className="flex min-h-dvh flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        <header className="sticky top-0 z-50 bg-background pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-6">
            <Link
              href="/"
              aria-label={`${SITE.name} home`}
              className="flex h-11 shrink-0 items-center text-2xl xl:text-3xl"
            >
              <Wordmark />
            </Link>
            <nav aria-label="Main" className="hidden gap-5 md:flex xl:gap-7">
              {SITE.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-semibold whitespace-nowrap underline-offset-4 hover:underline"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
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
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
