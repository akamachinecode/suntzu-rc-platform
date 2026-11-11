"use client";

import { MenuIcon, SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { openSearch } from "@/components/search/site-search";
import { SITE } from "@/lib/site";

/**
 * The main navigation on small screens: a toggle that opens a full-width panel under the header,
 * in the page's own gray. It closes when a page is chosen, on Escape, on a tap outside it, and
 * whenever the page changes.
 */
export function MobileNav() {
  const pathname = usePathname();
  // Open only on the page it was opened on: moving to another page closes it by itself.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const close = () => setOpenOn(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenOn(null);
    };
    const onPointer = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={box} className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpenOn(open ? null : pathname)}
        className="grid size-10 place-items-center rounded-md border-2 border-foreground bg-panel shadow-hard-sm"
      >
        {open ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="absolute inset-x-0 top-full border-y-2 border-foreground bg-background px-4 py-4"
        >
          <ul className="grid gap-1">
            {SITE.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  aria-current={item.href === pathname ? "page" : undefined}
                  className="block py-2 text-2xl font-black font-wide"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/search"
                onClick={(event) => {
                  event.preventDefault();
                  close();
                  openSearch();
                }}
                className="flex items-center gap-3 py-2 text-2xl font-black font-wide"
              >
                <SearchIcon aria-hidden="true" className="size-6" />
                Search
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
