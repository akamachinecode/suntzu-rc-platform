"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface PlanePart {
  id: PartId;
  name: string;
  does: string;
  figure: string;
  detail: string;
}

export type PartId =
  | "wing"
  | "ailerons"
  | "tail"
  | "elevator"
  | "rudder"
  | "motor"
  | "prop"
  | "esc"
  | "battery"
  | "receiver"
  | "servos"
  | "cg";

/** Top view of a high-wing trainer, nose up. Each shape carries the part it belongs to. */
function Planform({ active }: { active: PartId }) {
  const on = (...ids: PartId[]) => (ids.includes(active) ? "is-on" : undefined);
  return (
    <svg
      viewBox="0 0 400 420"
      role="img"
      aria-label="Top view of a high-wing trainer with the part being described highlighted."
      className="plane h-auto w-full"
    >
      {/* fuselage first: on a high-wing trainer the wing and tail sit on top of it */}
      <path
        className="body"
        d="M188 48 Q200 40 212 48 L216 120 L214 300 Q212 350 204 352 H196 Q188 350 186 300 L184 120 Z"
      />
      {/* inside the fuselage, front to back, drawn as if the skin were clear */}
      <rect className={on("esc")} x="192" y="56" width="16" height="12" rx="2" />
      <rect className={on("battery")} x="190" y="72" width="20" height="44" rx="3" />
      <rect className={on("receiver")} x="191" y="184" width="18" height="14" rx="2" />
      <rect className={on("servos")} x="190" y="204" width="9" height="16" rx="1.5" />
      <rect className={on("servos")} x="201" y="204" width="9" height="16" rx="1.5" />
      <path className={cn("rod", on("servos", "elevator"))} d="M194.5 220 L196 310" />
      <path className={cn("rod", on("servos", "rudder"))} d="M205.5 220 L201 300" />
      {/* wing, with ailerons on the outer trailing edge and a servo in each half */}
      <path
        className={on("wing")}
        d="M44 122 H356 Q372 122 372 136 V168 Q372 178 360 178 H40 Q28 178 28 168 V136 Q28 122 44 122 Z"
      />
      <path className={on("ailerons")} d="M44 164 H142 V178 H40 Q28 178 28 168 V164 Z" />
      <path className={on("ailerons")} d="M258 164 H356 Q372 164 372 168 Q372 178 360 178 H258 Z" />
      <rect className={on("servos")} x="104" y="146" width="16" height="9" rx="1.5" />
      <rect className={on("servos")} x="280" y="146" width="16" height="9" rx="1.5" />
      {/* tail: stabiliser with elevator, fin with rudder */}
      <path
        className={on("tail")}
        d="M138 304 H262 Q272 304 272 312 V322 H128 V312 Q128 304 138 304 Z"
      />
      <path
        className={on("elevator")}
        d="M128 322 H272 V330 Q272 338 262 338 H138 Q128 338 128 330 Z"
      />
      <path className={on("tail")} d="M197 286 H203 V338 H197 Z" />
      <path className={on("rudder")} d="M197 338 H203 V362 Q200 366 197 362 Z" />
      {/* nose: prop and motor */}
      <path className={on("prop")} d="M146 32 Q200 26 254 32 Q200 38 146 32 Z" />
      <circle className={on("motor")} cx="200" cy="40" r="9" />
      {/* balance point, a quarter to a third of the chord back */}
      <g className={cn("cg", on("cg"))}>
        <circle cx="200" cy="139" r="8" />
        <path d="M192 139 H208 M200 131 V147" />
      </g>
    </svg>
  );
}

/** Parts list on the right; as each one reaches the middle of the screen, it lights up on the plane. */
export function PlaneExplorer({ parts }: { parts: PlanePart[] }) {
  const [active, setActive] = useState<PartId>(parts[0]!.id);
  const current = parts.find((part) => part.id === active);

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16">
      {/* Pinned on every screen size: on phones it shrinks to a strip under the header. */}
      <div className="sticky top-[4.5rem] z-10 self-start md:top-24">
        <div className="flex items-center gap-4 rounded-xl border-2 border-foreground bg-panel p-3 shadow-hard md:block md:p-6 md:shadow-hard-lg">
          <div className="w-36 shrink-0 md:w-full">
            <Planform active={active} />
          </div>
          <p
            aria-live="polite"
            className="text-lg leading-tight font-black font-wide md:mt-2 md:text-center md:text-xl"
          >
            {current?.name}
          </p>
        </div>
      </div>
      <ol className="grid gap-6" aria-label="Parts of an RC trainer">
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
