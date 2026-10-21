import "@/components/iso/iso.css";
import type { KeyMark, LegendKey } from "@/components/iso/iso-kit";
import { cn } from "@/lib/utils";

/**
 * How Servo shows an Anatomy figure: drawn straight onto the page, with everything
 * around it centred. A heading above (figure number and title), the live readout and
 * the hint below, then the legend and caption.
 *
 * The readout keeps the kit's contract: it is the `[data-readout]` inside `.iso-plate`,
 * so `useReadout()` in each figure's live component finds and updates it.
 */
export function FigureFrame({
  fig,
  title,
  hint,
  readout,
  keys = [],
  caption,
  heading = true,
  className,
  children,
}: {
  fig: string;
  title?: string;
  hint?: string;
  readout: string;
  keys?: LegendKey[];
  caption?: React.ReactNode;
  /** When the page already titles the figure (the hero), the number moves down beside the readout. */
  heading?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const number = (
    <span className="rounded-md border-2 border-foreground bg-primary px-2 py-0.5 text-xs leading-none font-black font-wide">
      {fig}
    </span>
  );
  return (
    <figure className={cn("iso servo-figure", className)} data-theme="light">
      <div className="iso-plate servo-plate">
        {heading ? (
          <div className="flex items-center justify-center gap-3 text-center">
            {number}
            {title ? <span className="text-lg font-bold text-balance">{title}</span> : null}
          </div>
        ) : null}
        <div className={cn("-mx-4 sm:mx-0", heading && "mt-4")}>{children}</div>
        <div className="mt-4 flex flex-col items-center gap-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {heading ? null : number}
            <p
              data-readout=""
              className="rounded-full border-2 border-foreground bg-panel px-4 py-1 text-sm font-semibold tabular-nums shadow-hard-sm"
            >
              {readout}
            </p>
          </div>
          {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      {keys.length || caption ? (
        <figcaption className="mx-auto mt-6 flex max-w-[64ch] flex-col items-center gap-3 text-center text-sm text-pretty text-muted-foreground">
          {keys.length ? (
            <span className="flex flex-wrap justify-center gap-x-5 gap-y-1">
              {keys.map((key) => (
                <span key={key.label} className="inline-flex items-center gap-2">
                  <Swatch mark={key.mark} />
                  {key.label}
                </span>
              ))}
            </span>
          ) : null}
          {caption ? <span>{caption}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

function Swatch({ mark }: { mark: KeyMark }) {
  if (mark === "lit")
    return (
      <span
        aria-hidden="true"
        className="size-3 rounded-sm border-2 border-foreground bg-primary"
      />
    );
  if (mark === "raised" || mark === "flat")
    return (
      <span
        aria-hidden="true"
        className="size-3 rounded-sm border-2 border-muted-foreground bg-panel"
      />
    );
  return <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-foreground" />;
}
