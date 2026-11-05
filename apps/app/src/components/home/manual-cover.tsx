import { PencilLine } from "lucide-react";
import Link from "next/link";
import { ApartPreview } from "@/components/figures/apart/preview";
import { SLOTS as CAR_SLOTS } from "@/components/figures/car-apart/art";
import { CAR_SPEC } from "@/components/figures/car-apart/spec";
import { SLOTS as HELI_SLOTS } from "@/components/figures/heli-apart/art";
import { HELI_SPEC } from "@/components/figures/heli-apart/spec";
import { SLOTS as PLANE_SLOTS } from "@/components/figures/plane-apart/art";
import { PLANE_SPEC } from "@/components/figures/plane-apart/spec";
import { cn } from "@/lib/utils";

type Cover = "plane" | "heli" | "car" | "airspace";

// Black type reads on all of these; the green cover takes the mat's light ink.
const COLOURS: Record<Cover, string> = {
  plane: "bg-sky text-foreground",
  heli: "bg-primary text-foreground",
  car: "bg-mat text-mat-foreground",
  airspace: "bg-lead text-foreground",
};

/** A guide, drawn as the cover of a kit's assembly manual: stapled spine, number, exploded view. */
export function ManualCover({
  no,
  href,
  title,
  minutes,
  cover,
}: {
  no: number;
  href: string;
  title: string;
  minutes: number;
  cover: Cover;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full flex-col rounded-sm border-2 border-foreground pl-3 text-left shadow-hard-lg transition-transform duration-200 hover:-translate-y-1 hover:-rotate-1 motion-reduce:transform-none",
        COLOURS[cover],
      )}
    >
      {/* the spine, with its two staples */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-3 border-r-2 border-foreground bg-foreground/15"
      />
      {["top-[20%]", "bottom-[20%]"].map((position) => (
        <span
          key={position}
          aria-hidden="true"
          className={cn(
            "absolute left-[3px] h-8 w-1.5 rounded-full border border-foreground bg-panel",
            position,
          )}
        />
      ))}

      <span className="flex items-center justify-between bg-foreground px-4 py-2 text-xs font-bold tracking-[0.2em] text-primary uppercase">
        <span>Manual No. {String(no).padStart(2, "0")}</span>
        <span>{minutes} min</span>
      </span>
      <div className="m-4 rounded-sm border-2 border-foreground bg-panel">
        {cover === "plane" ? (
          <div aria-hidden="true" className="p-2">
            <ApartPreview
              spec={PLANE_SPEC}
              slots={PLANE_SLOTS}
              lit="wing"
              view={[84, 102, 448, 338]}
              label="The trainer from the guide, part-way apart"
            />
          </div>
        ) : cover === "heli" ? (
          <div aria-hidden="true" className="p-2">
            <ApartPreview
              spec={HELI_SPEC}
              slots={HELI_SLOTS}
              apart={0.16}
              lit="blades"
              view={[86, 97, 486, 367]}
              label="The helicopter from the guide, part-way apart"
            />
          </div>
        ) : cover === "car" ? (
          <div aria-hidden="true" className="p-2">
            <ApartPreview
              spec={CAR_SPEC}
              slots={CAR_SLOTS}
              apart={0.2}
              lit="body"
              view={[136, 123, 412, 311]}
              label="The truck from the guide, part-way apart"
            />
          </div>
        ) : (
          <Airspace />
        )}
      </div>
      <div className="mt-auto px-4 pb-5">
        <h3 className="text-2xl leading-tight font-black text-balance font-wide">{title}</h3>
        <span className="mt-3 inline-block text-sm font-bold underline underline-offset-4 group-hover:decoration-2">
          Read the guide
        </span>
      </div>
    </Link>
  );
}

/** The guides still being written: a cover that's only been sketched. */
export function DraftCover({ titles }: { titles: readonly string[] }) {
  return (
    <div className="flex h-full flex-col rounded-sm border-2 border-dashed border-foreground/60 p-5 text-left">
      <p className="-rotate-3 self-start rounded-sm border-2 border-foreground px-2 py-1 text-xs font-black tracking-[0.2em] uppercase">
        In the works
      </p>
      <ul className="mt-6 grid gap-4">
        {titles.map((title) => (
          <li key={title} className="flex gap-3 leading-tight font-bold">
            <PencilLine aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
            {title}
          </li>
        ))}
      </ul>
    </div>
  );
}

const ink = { stroke: "var(--foreground)", strokeWidth: 3, strokeLinejoin: "round" } as const;

/** Controlled airspace around an airport, and a trainer flying wide of it. */
function Airspace() {
  return (
    <svg viewBox="0 0 240 170" aria-hidden="true" className="block h-auto w-full">
      {[44, 70].map((r) => (
        <circle
          key={r}
          cx="110"
          cy="86"
          r={r}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
      ))}
      {/* two parallel runways */}
      {[-7, 7].map((offset) => (
        <rect
          key={offset}
          x="88"
          y={81 + offset}
          width="44"
          height="8"
          rx="2"
          fill="var(--foreground)"
          transform="rotate(-30 110 86)"
        />
      ))}
      {/* the way round */}
      <path
        d="M 16 156 Q 40 168 90 164 Q 236 160 212 46"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="2"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <g transform="translate(212 32) rotate(-8)">
        <path d="M -3 -14 H 3 V 14 H -3 Z" fill="var(--primary)" {...ink} />
        <path d="M -18 -4 H 18 V 3 H -18 Z" fill="var(--primary)" {...ink} />
        <path d="M -8 11 H 8" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* north */}
      <path d="M 22 40 L 30 18 L 38 40 L 30 34 Z" fill="var(--foreground)" />
      <text
        x="30"
        y="56"
        textAnchor="middle"
        fontSize="13"
        fontWeight="900"
        fill="var(--foreground)"
      >
        N
      </text>
    </svg>
  );
}
