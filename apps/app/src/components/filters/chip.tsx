"use client";

import { cn } from "@/lib/utils";

/** A filter or view button that stays pressed: 44 px tall, so a thumb can hit it. */
export function Chip({
  pressed,
  onClick,
  className,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-md border-2 border-foreground px-4 py-2 text-sm font-semibold shadow-hard-sm transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transform-none",
        pressed ? "bg-foreground text-background" : "bg-panel",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A labelled group of chips in the filters panel. */
export function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-xs font-black tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </legend>
      <div className="mt-3 flex flex-wrap gap-3">{children}</div>
    </fieldset>
  );
}
