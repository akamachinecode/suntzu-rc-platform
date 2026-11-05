"use client";

import { MenuIcon, SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { openSearch } from "@/components/search/site-search";
import { SITE } from "@/lib/site";

/** The main navigation on small screens: a toggle that opens a full-width panel under the header. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((value) => !value)}
        className="grid size-10 place-items-center rounded-md border-2 border-foreground bg-panel shadow-hard-sm"
      >
        {open ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="absolute inset-x-0 top-full bg-panel px-4 py-4"
        >
          <ul className="grid gap-1">
            {SITE.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block py-2 text-2xl font-black font-wide">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/search"
                onClick={(event) => {
                  event.preventDefault();
                  setOpen(false);
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
