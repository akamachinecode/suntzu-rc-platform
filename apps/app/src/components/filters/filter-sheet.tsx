"use client";

import { SlidersHorizontal, XIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";

/**
 * Filters on a phone: one "Filters" button (with how many are on) that opens every filter in a
 * panel from the bottom of the screen, in the page's gray, with a button that shows the results.
 * Wider screens keep their filters on the page and never show this.
 */
export function FilterSheet({
  count,
  results,
  onClear,
  children,
}: {
  /** How many filters are on. */
  count: number;
  /** What the panel's main button says: "Show 12 events". */
  results: string;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="min-h-11">
          <SlidersHorizontal aria-hidden="true" />
          Filters
          {count ? (
            <span className="grid size-6 place-items-center rounded-full bg-foreground text-xs font-black text-background">
              {count}
              <span className="sr-only"> on</span>
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="top-auto bottom-0 left-0 flex max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-2 border-b-0 border-foreground bg-background p-0 text-base text-foreground ring-0 sm:max-w-none data-open:zoom-in-100 data-open:slide-in-from-bottom-8 data-closed:zoom-out-100 data-closed:slide-out-to-bottom-8"
      >
        <div className="flex items-center justify-between gap-4 border-b-2 border-foreground px-5 py-3">
          <DialogTitle className="text-xl font-black font-wide">Filters</DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-md border-2 border-foreground bg-panel shadow-hard-sm"
            >
              <XIcon aria-hidden="true" />
              <span className="sr-only">Close filters</span>
            </button>
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">
          Choose what to show. The list changes as you choose.
        </DialogDescription>
        <div className="grid min-h-0 flex-1 gap-7 overflow-y-auto overscroll-contain px-5 py-6">
          {children}
        </div>
        <div className="flex gap-3 border-t-2 border-foreground px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" size="lg" onClick={onClear} disabled={!count}>
            Clear
          </Button>
          <DialogClose asChild>
            <Button size="lg" className="flex-1">
              {results}
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
