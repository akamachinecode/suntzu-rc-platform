import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { SEARCH_SHORTCUTS } from "@/lib/search";

/** This weekend, Near me, Can I fly here? and Send us your event: where to go from an empty search. */
export function SearchShortcuts() {
  return (
    <ul aria-label="Shortcuts" className="flex flex-wrap gap-3">
      {SEARCH_SHORTCUTS.map(({ label, href, icon: Icon }) => (
        <li key={href}>
          <Button asChild variant="outline">
            <Link href={href}>
              <Icon aria-hidden="true" />
              {label}
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}
