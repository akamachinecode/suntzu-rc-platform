import { Tag, type Tone } from "@/components/home/tag";
import { cn } from "@/lib/utils";

/**
 * A section headline in the hero's style: a plain first line, and the second on a block of
 * colour. Every home section after the hero opens with one.
 */
export function SectionTitle({
  id,
  lead,
  tag,
  tone,
  className,
}: {
  id: string;
  lead: string;
  tag: string;
  tone: Tone;
  className?: string;
}) {
  return (
    <h2
      id={id}
      className={cn(
        "text-center text-[2.3rem] leading-[0.95] font-black text-balance font-wide min-[400px]:text-[2.6rem] sm:text-6xl lg:text-7xl",
        className,
      )}
    >
      {lead}{" "}
      <span className="mt-3 block">
        <Tag tone={tone}>{tag}</Tag>
      </span>
    </h2>
  );
}
