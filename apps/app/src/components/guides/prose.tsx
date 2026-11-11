import { cn } from "@/lib/utils";

/**
 * Long-form building blocks for guides, so every article reads the same way.
 * Everything in an article shares one column: text, titles, figures, timelines and
 * tables. 45rem of content keeps body text near 80 characters a line.
 */
export const COLUMN = "mx-auto w-full max-w-[48rem] px-5 sm:px-6";

export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        COLUMN,
        "text-lg leading-relaxed text-pretty [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&_p+p]:mt-5 [&_strong]:font-bold",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-[calc(var(--header)+2rem)] text-center text-4xl leading-[0.95] font-black tracking-tight text-balance font-wide sm:text-5xl"
    >
      {children}
    </h2>
  );
}

/** A block in the article column: section titles, figures, timelines, tables. */
export function Column({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(COLUMN, className)}>{children}</div>;
}

/** A wider block for reference pages (the rules guide), not for long-form articles. */
export function Wide({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-7xl px-5 sm:px-6", className)}>{children}</div>;
}
