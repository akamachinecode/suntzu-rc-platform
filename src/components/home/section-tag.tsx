import { cn } from "@/lib/utils";

const TONES = {
  sky: "bg-sky",
  lead: "bg-lead",
  primary: "bg-primary",
} as const;

/** A section title set on a block of colour, like a label stuck on the shelf it names. */
export function SectionTag({
  id,
  tone,
  children,
}: {
  id: string;
  tone: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className={cn(
        "inline-block -rotate-1 rounded-md border-2 border-foreground px-5 pt-2.5 pb-2 text-3xl leading-none font-black text-balance text-foreground uppercase font-wide shadow-hard sm:text-5xl",
        TONES[tone],
      )}
    >
      {children}
    </h2>
  );
}
