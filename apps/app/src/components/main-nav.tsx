"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";

/** The main navigation on wider screens. Marks the current page, as the phone menu does. */
export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden gap-5 md:flex xl:gap-7">
      {SITE.nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.href === pathname ? "page" : undefined}
          className="text-sm font-semibold whitespace-nowrap underline-offset-4 hover:underline aria-[current=page]:underline aria-[current=page]:decoration-2"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
