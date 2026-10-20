import { cn } from "@/lib/utils";

/** Long-form building blocks for guides, so every article reads the same way. */

export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto max-w-7xl px-4", className)}>
      <div className="mx-auto max-w-[68ch] text-lg leading-relaxed text-pretty [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&_p+p]:mt-5 [&_strong]:font-bold">
        {children}
      </div>
    </div>
  );
}

export function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-4xl leading-[0.95] font-black tracking-tight text-balance font-wide sm:text-6xl"
    >
      {children}
    </h2>
  );
}

export function Wide({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-7xl px-4", className)}>{children}</div>;
}
