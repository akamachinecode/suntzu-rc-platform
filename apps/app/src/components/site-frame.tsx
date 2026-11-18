import Link from "next/link";
import { AccountButton } from "@/components/account/account-button";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";
import { PageEnd } from "@/components/page-end";
import { SiteSearch } from "@/components/search/site-search";
import { SiteFooter } from "@/components/site-footer";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@workspace/ui/components/button";
import { SITE } from "@/lib/site";

/**
 * The site's frame: skip link, sticky header, the page and the footer. Public pages
 * (`app/(site)/layout.tsx`), the private area (`app/(app)/layout.tsx`) and the 404 page share it:
 * members move between the two areas all the time, and their account lives in this header.
 */
export function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
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
    </>
  );
}
