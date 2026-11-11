import { cn } from "@/lib/utils";

const LANYARDS = ["bg-sky", "bg-primary", "bg-lead"];
const TILTS = ["-rotate-2", "rotate-1", "-rotate-1"];

/**
 * The path from a first message to a first lesson, as pit passes hanging off the workshop
 * pegboard: the same passes the home page hangs its events on, numbered instead of dated.
 */
export function StepTickets({ steps }: { steps: readonly { title: string; body: string }[] }) {
  return (
    <ol className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-12">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className={cn(
            "flex w-full max-w-72 origin-top flex-col items-center",
            TILTS[index % TILTS.length],
          )}
        >
          {/* peg, lanyard and clip */}
          <span
            aria-hidden="true"
            className="relative z-10 size-5 rounded-full border-2 border-foreground bg-panel"
          />
          <span
            aria-hidden="true"
            className={cn(
              "-mt-1.5 h-12 w-5 border-x-2 border-foreground",
              LANYARDS[index % LANYARDS.length],
            )}
          />
          <span
            aria-hidden="true"
            className="-mt-0.5 h-4 w-10 rounded-sm border-2 border-foreground bg-muted-foreground"
          />
          <div className="relative -mt-1 w-full rounded-xl border-2 border-foreground bg-panel text-center shadow-hard-lg">
            {/* the slot the clip goes through */}
            <span
              aria-hidden="true"
              className="absolute top-3 left-1/2 h-3 w-14 -translate-x-1/2 rounded-full border-2 border-foreground bg-muted"
            />
            <span
              className={cn(
                "mt-9 block border-y-2 border-foreground py-1.5 text-xs font-black tracking-[0.25em] uppercase",
                LANYARDS[index % LANYARDS.length],
              )}
            >
              Step {index + 1}
            </span>
            <div className="px-6 pt-5">
              <span aria-hidden="true" className="block text-6xl leading-none font-black font-wide">
                {index + 1}
              </span>
              <h3 className="mt-4 text-xl leading-tight font-bold text-balance">{step.title}</h3>
              <p className="mt-2 text-pretty text-muted-foreground">{step.body}</p>
            </div>
            <span
              aria-hidden="true"
              className="mx-8 my-5 block h-8 bg-[repeating-linear-gradient(90deg,var(--foreground)_0_3px,transparent_3px_5px,var(--foreground)_5px_6px,transparent_6px_10px,var(--foreground)_10px_12px,transparent_12px_13px)]"
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
