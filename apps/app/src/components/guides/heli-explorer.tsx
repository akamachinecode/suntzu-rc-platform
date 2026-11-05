"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type HeliPartId =
  | "blades"
  | "head"
  | "swash"
  | "servos"
  | "fbl"
  | "motor"
  | "esc"
  | "battery"
  | "canopy"
  | "tail"
  | "tailrotor"
  | "tailservo"
  | "skids";

export interface HeliPart {
  id: HeliPartId;
  name: string;
  does: string;
  figure: string;
  detail: string;
}

/** Side view of a 450, nose to the right. Each shape carries the part it belongs to. */
function SideView({ active }: { active: HeliPartId }) {
  const on = (...ids: HeliPartId[]) => (ids.includes(active) ? "is-on" : undefined);
  return (
    <svg
      viewBox="0 0 400 230"
      role="img"
      aria-label="Side view of a 450-class helicopter with the part being described highlighted."
      className="plane h-auto w-full"
    >
      {/* tail first: boom, fin, the pushrod and servo on it, the tail rotor at the end */}
      <path className={on("tail")} d="M30 102 H164 V108 H30 Z" />
      <path className={on("tail")} d="M30 108 L22 140 H34 L42 108 Z" />
      <path className={on("tail")} d="M64 100 H96 V96 H64 Z" />
      <path className={cn("rod", on("tailservo"))} d="M124 92 L34 99" />
      <rect className={on("tailservo")} x="124" y="86" width="16" height="12" rx="2" />
      <rect className={on("tailrotor")} x="17" y="78" width="6" height="52" rx="2" />
      <circle className={on("tailrotor")} cx="20" cy="104" r="4" />
      {/* skids under the frame */}
      <path className={cn("rod", on("skids"))} d="M178 160 L168 196 M246 160 L256 196" />
      <path
        className={on("skids")}
        d="M150 196 H278 Q286 196 288 190 L291 186 L294 188 Q290 202 278 202 H150 Q146 202 146 199 Q146 196 150 196 Z"
      />
      {/* the frame, with the main gear under it and what sits inside, as if the plates were clear */}
      <path className="body" d="M160 160 V112 L172 82 H236 L256 104 V160 Z" />
      <circle className={on("motor")} cx="204" cy="162" r="14" />
      <rect className={on("motor")} x="226" y="112" width="16" height="26" rx="3" />
      <rect className={on("fbl")} x="168" y="140" width="18" height="10" rx="2" />
      <rect className={on("servos")} x="170" y="92" width="16" height="20" rx="2" />
      <rect className={on("servos")} x="220" y="92" width="16" height="20" rx="2" />
      {/* the canopy over the nose, the battery and speed controller under it */}
      <path
        className={on("canopy")}
        d="M236 84 Q300 70 334 110 Q342 130 318 144 Q290 156 256 152 L248 104 Z"
      />
      <rect className={on("battery")} x="262" y="118" width="48" height="16" rx="3" />
      <rect className={on("esc")} x="190" y="122" width="26" height="12" rx="2" />
      {/* shaft, swashplate, head and blades on top */}
      <path className={cn("rod", on("head"))} d="M204 82 V52" />
      <rect className={on("swash")} x="188" y="64" width="32" height="8" rx="3" />
      <rect className={on("head")} x="194" y="42" width="20" height="14" rx="3" />
      <path className={on("blades")} d="M28 46 Q24 46 24 49 Q24 52 28 52 H196 V46 Z" />
      <path className={on("blades")} d="M212 46 H372 Q376 46 376 49 Q376 52 372 52 H212 Z" />
    </svg>
  );
}

/** Parts list on the right; as each one reaches the middle of the screen, it lights up on the heli. */
export function HeliExplorer({ parts }: { parts: HeliPart[] }) {
  const [active, setActive] = useState<HeliPartId>(parts[0]!.id);
  const current = parts.find((part) => part.id === active);

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-16">
      {/* Pinned on every screen size: on phones it shrinks to a strip under the header. */}
      <div className="sticky top-[4.5rem] z-10 self-start md:top-24">
        <div className="flex items-center justify-center gap-6 rounded-xl border-2 border-foreground bg-panel p-3 shadow-hard sm:gap-10 sm:p-4 md:block md:p-6 md:shadow-hard-lg">
          <div className="w-36 shrink-0 sm:w-48 md:w-full">
            <SideView active={active} />
          </div>
          <p
            aria-live="polite"
            className="w-[12ch] text-lg leading-tight font-black font-wide sm:text-2xl md:mt-2 md:w-auto md:text-center md:text-xl"
          >
            {current?.name}
          </p>
        </div>
      </div>
      <ol className="grid gap-6" aria-label="Parts of an RC helicopter">
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
