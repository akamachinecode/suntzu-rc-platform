"use client";

import type { SearchResponse } from "@workspace/shared";
import { ArrowRight, History, type LucideIcon, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  browserApi,
  formatResultDates,
  groupResults,
  readRecent,
  reportMiss,
  saveRecent,
  SEARCH_SHORTCUTS,
  searchUrl,
} from "@/lib/search";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "servo:open-search";

/** Opens the search box from anywhere on the page (the mobile menu uses it). */
export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

interface Option {
  key: string;
  label: string;
  detail?: string;
  badge?: string;
  icon?: LucideIcon;
  muted?: boolean;
  // Opens a page, or puts these words back in the box (a recent search).
  href?: string;
  fill?: string;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Search from any page (spec 0005, slice 3): the header's button, ⌘K or Ctrl+K, or "/". Results
 * come as you type, grouped; arrows move through them and Enter opens one, or the results page
 * when none is chosen. It fills the screen on a phone. Without JavaScript the button is a link
 * to /search.
 */
export function SiteSearch() {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  function show() {
    setQuery("");
    setResponse(null);
    setStatus("idle");
    setActive(-1);
    setRecent(readRecent());
    setOpen(true);
  }

  function close() {
    // Gave up on a search that found nothing or only partial matches: the crew hears about it,
    // anonymously. Opening a result isn't giving up, and the results page reports for itself.
    if (response && query.trim()) reportMiss(response);
    setOpen(false);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) close();
        else show();
      } else if (
        event.key === "/" &&
        !open &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTyping(event.target)
      ) {
        event.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, show);
    };
  });

  // Results as you type: a short pause, and a slower search is cancelled by the next one.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const { data } = await browserApi
        .GET("/search", { params: { query: { q, limit: 8 } }, signal: controller.signal })
        .catch(() => ({ data: undefined }));
      if (controller.signal.aborted) return;
      setResponse(data ?? null);
      setStatus(data ? "done" : "error");
      setActive(-1);
    }, 150);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const q = query.trim();
  const sections: { key: string; label: string; options: Option[] }[] = [];
  const shortcuts: Option[] = SEARCH_SHORTCUTS.map((shortcut) => ({
    key: shortcut.href,
    label: shortcut.label,
    href: shortcut.href,
    icon: shortcut.icon,
  }));
  if (!q) {
    if (recent.length) {
      sections.push({
        key: "recent",
        label: "Recent searches",
        options: recent.map((words) => ({ key: words, label: words, fill: words, icon: History })),
      });
    }
    sections.push({ key: "shortcuts", label: "Shortcuts", options: shortcuts });
  } else if (response?.results.length) {
    for (const group of groupResults(response.results)) {
      sections.push({
        key: group.key,
        label: group.label,
        options: group.results.map((result) => ({
          key: result.id,
          label: result.title,
          href: result.url,
          detail: [result.subtitle, formatResultDates(result)].filter(Boolean).join(" · "),
          ...(result.past
            ? { badge: "Past", muted: true }
            : result.miles !== null && { badge: `${result.miles} mi` }),
        })),
      });
    }
    sections.push({
      key: "all",
      label: "Everything",
      options: [
        { key: "all", label: `All results for “${q}”`, href: searchUrl(q), icon: ArrowRight },
      ],
    });
  } else if (status === "done") {
    sections.push({ key: "shortcuts", label: "Try one of these", options: shortcuts });
  }
  const options = sections.flatMap((section) => section.options);
  // Where each section's options start in `options`, for the arrow keys.
  const starts = sections.map((_, at) =>
    sections.slice(0, at).reduce((sum, section) => sum + section.options.length, 0),
  );
  const optionId = (index: number) => `${id}-option-${index}`;

  function go(href: string) {
    if (q) saveRecent(q);
    setOpen(false);
    router.push(href);
  }

  function choose(option: Option) {
    if (option.fill !== undefined) {
      setQuery(option.fill);
      setStatus("loading");
      setActive(-1);
    } else if (option.href) go(option.href);
  }

  function move(to: number) {
    setActive(to);
    document.getElementById(optionId(to))?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      move(active + 1 >= options.length ? 0 : active + 1);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      move(active <= 0 ? options.length - 1 : active - 1);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const option = options[active];
      if (option) choose(option);
      else if (q) go(searchUrl(q));
    }
  }

  const announcement =
    status === "done" && response
      ? response.results.length
        ? `${response.results.length} ${response.results.length === 1 ? "result" : "results"}. Use the arrow keys to choose one.`
        : `Nothing found for ${q}.`
      : status === "error"
        ? "Search isn't answering. Press Enter for the results page."
        : "";

  return (
    <>
      <Button asChild variant="outline" className="max-sm:size-10 max-sm:px-0">
        <Link
          href="/search"
          onClick={(event) => {
            event.preventDefault();
            show();
          }}
          aria-keyshortcuts="Meta+K Control+K"
        >
          <Search aria-hidden="true" />
          <span className="max-sm:sr-only">Search</span>
          <kbd
            aria-hidden="true"
            className="ml-1 hidden rounded border border-foreground/30 px-1 font-sans text-xs text-muted-foreground lg:inline"
          >
            /
          </kbd>
        </Link>
      </Button>

      <Dialog open={open} onOpenChange={(next) => (next ? show() : close())}>
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-foreground bg-panel p-0 ring-0 sm:top-[10vh] sm:left-1/2 sm:h-auto sm:max-h-[80vh] sm:max-w-2xl sm:-translate-x-1/2 sm:rounded-xl sm:border-2 sm:shadow-hard-lg"
        >
          <DialogTitle className="sr-only">Search SunTzu RC</DialogTitle>
          <DialogDescription className="sr-only">
            Events, places, clubs, guides and rules. Results appear as you type; press Enter for
            every result.
          </DialogDescription>
          <div className="flex items-center gap-3 border-b-2 border-foreground px-4">
            <Search aria-hidden="true" className="size-5 shrink-0" />
            <input
              type="text"
              role="combobox"
              aria-label="Search SunTzu RC"
              aria-expanded={options.length > 0}
              aria-controls={`${id}-list`}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? optionId(active) : undefined}
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              maxLength={100}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(-1);
                if (event.target.value.trim()) setStatus("loading");
                else {
                  setResponse(null);
                  setStatus("idle");
                }
              }}
              onKeyDown={onKeyDown}
              placeholder="Events, fields, clubs, rules…"
              className="h-14 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
            />
            <Button variant="ghost" size="sm" onClick={close}>
              Close
            </Button>
          </div>

          <div
            data-lenis-prevent
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2 sm:max-h-[60vh]"
          >
            {q && status === "done" && response?.partial ? (
              <p className="px-4 pt-4 text-sm text-pretty text-muted-foreground">
                Nothing matches every word. These come closest:
              </p>
            ) : null}
            {q && status === "done" && !response?.results.length ? (
              <p className="px-4 pt-4 text-pretty">
                Nothing found for &ldquo;{q}&rdquo;. Try fewer words, a town or a ZIP code.
              </p>
            ) : null}
            {status === "error" ? (
              <p className="px-4 pt-4 text-pretty">
                Search isn&apos;t answering right now. Press Enter to try the results page.
              </p>
            ) : null}
            <div id={`${id}-list`} role="listbox" aria-label="Search results">
              {sections.map((section, sectionAt) => (
                <div key={section.key} role="group" aria-labelledby={`${id}-${section.key}`}>
                  <div
                    id={`${id}-${section.key}`}
                    className="px-4 pt-4 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                  >
                    {section.label}
                  </div>
                  {section.options.map((option, optionAt) => {
                    const at = starts[sectionAt]! + optionAt;
                    const Icon = option.icon;
                    const className = cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left",
                      at === active && "bg-primary",
                      option.muted && at !== active && "text-muted-foreground",
                    );
                    const body = (
                      <>
                        {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
                        <span className="grid min-w-0 flex-1">
                          <span className="truncate font-semibold">{option.label}</span>
                          {option.detail ? (
                            <span className="truncate text-sm text-muted-foreground">
                              {option.detail}
                            </span>
                          ) : null}
                        </span>
                        {option.badge ? (
                          <span className="shrink-0 rounded border-2 border-foreground px-1.5 text-xs font-semibold">
                            {option.badge}
                          </span>
                        ) : null}
                      </>
                    );
                    return option.href ? (
                      <Link
                        key={option.key}
                        id={optionId(at)}
                        role="option"
                        aria-selected={at === active}
                        tabIndex={-1}
                        href={option.href}
                        onClick={() => {
                          if (q) saveRecent(q);
                          setOpen(false);
                        }}
                        onMouseMove={() => at !== active && setActive(at)}
                        className={className}
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        key={option.key}
                        id={optionId(at)}
                        type="button"
                        role="option"
                        aria-selected={at === active}
                        tabIndex={-1}
                        onClick={() => choose(option)}
                        onMouseMove={() => at !== active && setActive(at)}
                        className={className}
                      >
                        {body}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
