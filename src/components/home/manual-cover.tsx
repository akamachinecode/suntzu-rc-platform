import { PencilLine } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Cover = "plane" | "airspace";

const COLOURS: Record<Cover, string> = { plane: "bg-sky", airspace: "bg-lead" };

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
        "group relative flex h-full flex-col rounded-sm border-2 border-foreground pl-3 text-left text-foreground shadow-hard-lg transition-transform duration-200 hover:-translate-y-1 hover:-rotate-1 motion-reduce:transform-none",
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
        {cover === "plane" ? <ExplodedPlane /> : <Airspace />}
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

/** A trainer side-on, with its wing lifted off and the arrows that put it back. */
function ExplodedPlane() {
  return (
    <svg viewBox="0 0 240 170" aria-hidden="true" className="block h-auto w-full">
      <circle cx="22" cy="24" r="12" fill="var(--foreground)" />
      <text x="22" y="29" textAnchor="middle" fontSize="14" fontWeight="900" fill="var(--primary)">
        1
      </text>
      {/* the wing, off */}
      <path
        d="M 72 50 Q 82 34 122 34 Q 164 36 174 48 Q 124 56 72 50 Z"
        fill="var(--primary)"
        {...ink}
      />
      {[98, 148].map((x) => (
        <g key={x} stroke="var(--foreground)" strokeWidth="2">
          <path d={`M ${x} 60 V 84`} strokeDasharray="4 4" />
          <path d={`M ${x - 5} 82 L ${x} 90 L ${x + 5} 82`} fill="none" />
        </g>
      ))}
      {/* fuselage, fin and tailplane */}
      <path
        d="M 44 106 Q 44 96 56 96 H 182 L 214 100 V 108 L 182 116 H 56 Q 44 116 44 106 Z"
        fill="var(--panel)"
        {...ink}
      />
      <path d="M 192 98 L 206 72 H 218 L 214 100 Z" fill="var(--primary)" {...ink} />
      <path d="M 184 106 H 226" stroke="var(--foreground)" strokeWidth="4" strokeLinecap="round" />
      {/* nose, spinner and prop */}
      <path d="M 44 99 L 30 106 L 44 113 Z" fill="var(--primary)" {...ink} />
      <path d="M 26 74 V 138" stroke="var(--foreground)" strokeWidth="5" strokeLinecap="round" />
      {/* undercarriage */}
      <path d="M 76 116 L 66 140" fill="none" {...ink} />
      <circle cx="66" cy="144" r="8" fill="var(--panel)" {...ink} />
      <circle cx="200" cy="120" r="4" fill="var(--foreground)" />
    </svg>
  );
}

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
