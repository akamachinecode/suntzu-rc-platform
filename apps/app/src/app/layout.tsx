import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { SiteFooter } from "@/components/site-footer";
import { SmoothScroll } from "@/components/smooth-scroll";
import { Button } from "@workspace/ui/components/button";
import { Wordmark } from "@/components/wordmark";
import { SITE } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

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
    <html lang={SITE.lang} className={`${archivo.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <SmoothScroll>
          <header className="sticky top-0 z-50 bg-background">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4">
              <Link href="/" aria-label={`${SITE.name} home`} className="text-3xl">
                <Wordmark />
              </Link>
              <nav aria-label="Main" className="hidden gap-7 md:flex">
                {SITE.nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm font-semibold underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-3">
                <Button asChild className="max-sm:hidden">
                  <Link href={SITE.cta.href}>{SITE.cta.label}</Link>
                </Button>
                <MobileNav />
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </SmoothScroll>
      </body>
    </html>
  );
}
