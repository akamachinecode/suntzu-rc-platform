"use client";

import { GraduationCap, Package, ShieldCheck, Users, Zap, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

export interface Decal {
  id: string;
  short: string;
  tag: string;
}

/** A 14-point starburst, as a clip-path polygon. */
const BURST = (() => {
  const points: string[] = [];
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 50 : 39;
    points.push(
      `${(50 + r * Math.cos(angle)).toFixed(1)}% ${(50 + r * Math.sin(angle)).toFixed(1)}%`,
    );
  }
  return `polygon(${points.join(",")})`;
})();

/**
 * Each service gets its own die-cut shape, the way a kit's decal sheet mixes roundels,
 * number plates and flashes. `at` places it on the sheet on large screens.
 */
const LOOKS: Record<
  string,
  {
    icon: LucideIcon;
    shape: "round" | "plate" | "burst" | "oval" | "checker";
    tilt: number;
    at: string;
  }
> = {
  lessons: { icon: GraduationCap, shape: "round", tilt: -8, at: "lg:left-[7%] lg:top-[9%]" },
  "first-model": { icon: Package, shape: "plate", tilt: 6, at: "lg:right-[7%] lg:top-[11%]" },
  rules: {
    icon: ShieldCheck,
    shape: "checker",
    tilt: -3,
    at: "lg:left-1/2 lg:top-[5%] lg:-translate-x-1/2",
  },
  advanced: { icon: Zap, shape: "burst", tilt: 10, at: "lg:left-[9%] lg:bottom-[8%]" },
  connect: { icon: Users, shape: "oval", tilt: -6, at: "lg:right-[8%] lg:bottom-[12%]" },
};

function Sticker({ decal, index }: { decal: Decal; index: number }) {
  const look = LOOKS[decal.id] ?? LOOKS.lessons!;
  const reduce = useReducedMotion();
  const Icon = look.icon;
  const label = (
    <span className="grid justify-items-center gap-1 text-center">
      <Icon aria-hidden="true" className="size-5 lg:size-6" strokeWidth={2.5} />
      <span className="text-lg leading-none font-black font-wide lg:text-xl">{decal.short}</span>
      <span className="text-[0.7rem] leading-tight font-semibold lg:text-xs">{decal.tag}</span>
    </span>
  );

  // The white margin around every shape is the die-cut edge.
  const face = {
    round: (
      <span className="grid size-32 place-items-center rounded-full border-[6px] border-panel bg-primary text-foreground shadow-[3px_3px_0_0_var(--foreground)] lg:size-40">
        {label}
      </span>
    ),
    plate: (
      <span className="grid w-36 place-items-center rounded-xl border-[6px] border-panel bg-panel p-1 shadow-[3px_3px_0_0_var(--foreground)] lg:w-52">
        <span className="grid w-full place-items-center rounded-lg border-[3px] border-foreground px-2 py-4 text-foreground lg:px-4 lg:py-5">
          {label}
        </span>
      </span>
    ),
    burst: (
      <span className="grid size-36 place-items-center drop-shadow-[3px_3px_0_var(--foreground)] lg:size-44">
        <span className="col-start-1 row-start-1 size-full bg-panel" style={{ clipPath: BURST }} />
        <span
          className="col-start-1 row-start-1 grid size-[88%] place-items-center bg-foreground text-primary"
          style={{ clipPath: BURST }}
        >
          {label}
        </span>
      </span>
    ),
    oval: (
      <span className="grid h-24 w-36 place-items-center rounded-[50%] border-[6px] border-panel bg-mat text-mat-foreground shadow-[3px_3px_0_0_var(--foreground)] lg:h-32 lg:w-56">
        {label}
      </span>
    ),
    checker: (
      <span className="grid w-36 overflow-hidden rounded-xl border-[6px] border-panel bg-foreground text-background shadow-[3px_3px_0_0_var(--foreground)] lg:w-48">
        <span
          aria-hidden="true"
          className="h-4 bg-[repeating-conic-gradient(var(--foreground)_0_25%,var(--panel)_0_50%)] [background-size:16px_16px]"
        />
        <span className="px-2 py-3 lg:px-4 lg:py-4">{label}</span>
      </span>
    ),
  }[look.shape];

  return (
    <motion.div
      className={cn("relative lg:absolute", look.at)}
      initial={reduce ? false : { opacity: 0, scale: 1.35, rotate: look.tilt + 14 }}
      whileInView={{ opacity: 1, scale: 1, rotate: look.tilt }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.15 + index * 0.09 }}
    >
      <Link
        href={`/learn#${decal.id}`}
        className="group relative block transition-transform duration-200 ease-out hover:-translate-y-1 hover:-rotate-2 motion-reduce:transform-none"
      >
        {face}
        {/* The corner you'd pick at with a fingernail */}
        {look.shape === "plate" || look.shape === "checker" ? (
          <span
            aria-hidden="true"
            className="absolute top-0 right-0 size-0 rounded-bl-md bg-[linear-gradient(225deg,var(--muted)_50%,var(--panel)_50%)] shadow-[-2px_2px_3px_rgb(0_0_0/0.25)] transition-all duration-200 group-hover:size-7"
          />
        ) : null}
      </Link>
    </motion.div>
  );
}

function LogoDecal({ index }: { index: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className="relative self-center lg:absolute lg:bottom-[15%] lg:left-1/2 lg:-translate-x-1/2"
      initial={reduce ? false : { opacity: 0, scale: 1.35, rotate: 18 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 4 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.15 + index * 0.09 }}
    >
      <span className="block rounded-full border-[6px] border-panel bg-foreground px-4 py-1.5 shadow-[3px_3px_0_0_var(--foreground)] lg:px-6 lg:py-2">
        <Wordmark className="text-2xl text-primary lg:text-3xl" />
      </span>
    </motion.div>
  );
}

/** The crew section: a kit's decal sheet, with the headline as the big decal in the middle. */
export function DecalSheet({ decals }: { decals: Decal[] }) {
  return (
    <div className="relative mx-auto max-w-6xl -rotate-1 rounded-[1.25rem] border-2 border-foreground bg-muted px-5 pt-10 pb-8 shadow-hard-lg sm:px-10 lg:h-[36rem] lg:p-0">
      {/* Printer's marks: crop corners and a colour bar */}
      {[
        "top-3 left-3 border-t-2 border-l-2",
        "top-3 right-3 border-t-2 border-r-2",
        "bottom-3 left-3 border-b-2 border-l-2",
        "bottom-3 right-3 border-b-2 border-r-2",
      ].map((mark) => (
        <span
          key={mark}
          aria-hidden="true"
          className={cn("absolute size-4 border-foreground/50", mark)}
        />
      ))}
      <span aria-hidden="true" className="absolute top-3.5 left-10 flex gap-1">
        {["bg-primary", "bg-foreground", "bg-mat", "bg-panel"].map((swatch) => (
          <span key={swatch} className={cn("size-2.5 border border-foreground/40", swatch)} />
        ))}
      </span>

      {/* The big decal: vinyl letters with a white die-cut edge */}
      <h2
        id="crew-title"
        className="relative z-10 text-center text-5xl leading-[0.95] font-black text-balance text-foreground font-wide [-webkit-text-stroke:10px_var(--panel)] [paint-order:stroke_fill] sm:text-6xl lg:absolute lg:inset-x-0 lg:top-1/2 lg:-translate-y-1/2 lg:text-7xl"
      >
        Three of us.
        <br />
        <span className="text-primary [-webkit-text-stroke:10px_var(--foreground)]">
          One very loud hobby.
        </span>
      </h2>

      <div className="mt-10 grid grid-cols-2 justify-items-center gap-x-4 gap-y-8 lg:mt-0 lg:block">
        {decals.map((decal, index) => (
          <Sticker key={decal.id} decal={decal} index={index} />
        ))}
        {/* Every decal sheet carries the maker's logo. */}
        <LogoDecal index={decals.length} />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground lg:absolute lg:inset-x-0 lg:bottom-4 lg:mt-0">
        Servo decal sheet. Peel, stick, fly.{" "}
        <Link href="/learn" className="font-semibold text-foreground underline underline-offset-4">
          See everything we do
        </Link>
      </p>
    </div>
  );
}
