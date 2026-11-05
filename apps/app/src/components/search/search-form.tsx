import { Search } from "lucide-react";
import Form from "next/form";
import { Button } from "@workspace/ui/components/button";

/** The search field on the results page. A plain GET form, so it works without JavaScript. */
export function SearchForm({ q }: { q: string }) {
  return (
    <Form action="/search" role="search" className="mt-6 flex max-w-2xl gap-3">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search events, places, clubs, guides and rules</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <input
          type="search"
          name="q"
          defaultValue={q}
          maxLength={100}
          required
          placeholder="Markham Park, 33441, how high can I fly…"
          className="h-12 w-full rounded-md border-2 border-foreground bg-panel pr-3 pl-9 text-base shadow-hard-sm"
        />
      </label>
      <Button type="submit" size="lg">
        Search
      </Button>
    </Form>
  );
}
