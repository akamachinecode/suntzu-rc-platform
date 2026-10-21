"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface CarPart {
  id: CarPartId;
  name: string;
  does: string;
  figure: string;
  detail: string;
}

export type CarPartId =
  | "chassis"
  | "body"
  | "tyres"
  | "arms"
  | "shocks"
  | "steering"
  | "motor"
  | "gears"
  | "transmission"
  | "driveshafts"
  | "esc"
  | "receiver"
  | "battery";

/**
 * Top view of a two-wheel-drive short-course truck, nose up, body off. Each shape carries
 * the part it belongs to. Drawn with the plane explorer's styles: ink outlines, the part
 * being read in XT60 yellow.
 */
function TopView({ active }: { active: CarPartId }) {
  const on = (...ids: CarPartId[]) => (ids.includes(active) ? "is-on" : undefined);
  const wheels: Array<[number, number]> = [
    [86, 96],
    [314, 96],
    [86, 318],
    [314, 318],
  ];
  return (
    <svg
      viewBox="0 0 400 420"
      role="img"
      aria-label="Top view of a short-course truck with its body off, with the part being described highlighted."
      className="plane h-auto w-full"
    >
      {/* the body's outline, drawn as if it were clear */}
      <path
        className={cn("rod", on("body"))}
        d="M140 30 H260 Q300 30 304 70 L312 360 Q312 396 276 398 H124 Q88 396 88 360 L96 70 Q100 30 140 30 Z"
      />
      {/* chassis tub, bumpers */}
      <path
        className={cn("body", on("chassis"))}
        d="M150 60 H250 Q262 60 262 72 V348 Q262 360 250 360 H150 Q138 360 138 348 V72 Q138 60 150 60 Z"
      />
      <rect className={on("chassis")} x="150" y="40" width="100" height="18" rx="8" />
      <rect className={on("chassis")} x="150" y="362" width="100" height="18" rx="8" />
      {/* suspension arms out to the hubs */}
      {wheels.map(([x, y]) => (
        <path
          key={`arm-${x}-${y}`}
          className={on("arms")}
          d={
            x < 200
              ? `M138 ${y - 16} H${x + 28} V${y + 16} H138 Z`
              : `M262 ${y - 16} H${x - 28} V${y + 16} H262 Z`
          }
        />
      ))}
      {/* shocks, leaning in from the arms to the towers */}
      {wheels.map(([x, y]) => (
        <path
          key={`shock-${x}-${y}`}
          className={on("shocks")}
          d={
            x < 200
              ? `M${x + 30} ${y - 4} L166 ${y - 8} L166 ${y} L${x + 30} ${y + 4} Z`
              : `M${x - 30} ${y - 4} L234 ${y - 8} L234 ${y} L${x - 30} ${y + 4} Z`
          }
        />
      ))}
      {/* tyres */}
      {wheels.map(([x, y]) => (
        <rect
          key={`tyre-${x}-${y}`}
          className={on("tyres")}
          x={x - 23}
          y={y - 44}
          width="46"
          height="88"
          rx="14"
        />
      ))}
      {/* steering: servo, saver, links to the front hubs */}
      <rect className={on("steering")} x="178" y="126" width="44" height="22" rx="3" />
      <path className={cn("rod", on("steering"))} d="M200 136 L112 104 M200 136 L288 104" />
      <circle className={on("steering")} cx="200" cy="136" r="6" />
      {/* the receiver box and its antenna, the speed control */}
      <rect className={on("receiver")} x="214" y="168" width="28" height="30" rx="3" />
      <circle className={on("receiver")} cx="236" cy="174" r="3" />
      <rect className={on("esc")} x="214" y="230" width="28" height="40" rx="3" />
      <circle className={on("esc")} cx="228" cy="250" r="8" />
      {/* the battery down the middle */}
      <rect className={on("battery")} x="160" y="162" width="46" height="132" rx="5" />
      {/* motor, pinion and spur, transmission, driveshafts */}
      <rect className={on("motor")} x="168" y="296" width="40" height="30" rx="8" />
      <circle className={on("gears")} cx="214" cy="314" r="7" />
      <circle className={on("gears")} cx="226" cy="336" r="20" />
      <rect className={on("transmission")} x="168" y="328" width="48" height="26" rx="5" />
      <path className={cn("rod", on("driveshafts"))} d="M168 330 L112 318 M216 330 L288 318" />
    </svg>
  );
}

/** Parts list on the right; as each one reaches the middle of the screen, it lights up on the truck. */
export function CarExplorer({ parts }: { parts: CarPart[] }) {
  const [active, setActive] = useState<CarPartId>(parts[0]!.id);
  const current = parts.find((part) => part.id === active);

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-16">
      {/* Pinned on every screen size: on phones it shrinks to a strip under the header. */}
      <div className="sticky top-[4.5rem] z-10 self-start md:top-24">
        <div className="flex items-center justify-center gap-6 rounded-xl border-2 border-foreground bg-panel p-3 shadow-hard sm:gap-10 sm:p-4 md:block md:p-6 md:shadow-hard-lg">
          <div className="w-32 shrink-0 sm:w-44 md:w-full">
            <TopView active={active} />
          </div>
          <p
            aria-live="polite"
            className="w-[12ch] text-lg leading-tight font-black font-wide sm:text-2xl md:mt-2 md:w-auto md:text-center md:text-xl"
          >
            {current?.name}
          </p>
        </div>
      </div>
      <ol className="grid gap-6" aria-label="Parts of a short-course truck">
        {parts.map((part) => (
          <motion.li
            key={part.id}
            onViewportEnter={() => setActive(part.id)}
            viewport={{ margin: "-45% 0px -45% 0px" }}
            data-active={part.id === active}
            className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard transition-colors data-[active=true]:bg-primary"
          >
            <h3 className="text-2xl font-black font-wide">{part.name}</h3>
            <p className="mt-2 text-lg text-pretty">{part.does}</p>
            <p className="mt-4 inline-block rounded-md border-2 border-foreground bg-background px-2.5 py-1 font-bold">
              {part.figure}
            </p>
            <p className="mt-3 text-pretty text-muted-foreground">{part.detail}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
