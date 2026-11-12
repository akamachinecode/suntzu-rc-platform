import { PencilLine } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import airspaceCover from "@/components/home/covers/airspace.svg";
import carCover from "@/components/home/covers/car.svg";
import heliCover from "@/components/home/covers/heli.svg";
import planeCover from "@/components/home/covers/plane.svg";
import { cn } from "@/lib/utils";

type Cover = "plane" | "heli" | "car" | "airspace";

// Each guide's own hero figure, part-way apart with one assembly lit, drawn once into an SVG file
// (src/components/home/covers/draw.tsx). Flying legally has no figure of its own: its cover is an
// airport under its airspace, drawn for the cover (covers/airspace.tsx). As images they stay out
// of the page's HTML and are cached.
const STILLS: Record<Cover, StaticImageData> = {
  plane: planeCover,
  heli: heliCover,
  car: carCover,
  airspace: airspaceCover,
};

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
        <div aria-hidden="true" className="p-2">
          <Image src={STILLS[cover]} alt="" unoptimized className="block h-auto w-full" />
        </div>
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
