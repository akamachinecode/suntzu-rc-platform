import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import type { ScrollTransform } from "@/components/home/scroll-transform";
import { cn } from "@/lib/utils";

const ink = { stroke: "var(--foreground)", strokeWidth: 3, strokeLinejoin: "round" } as const;

/**
 * A part lying on the bench beside the hero's servo. It drops in when the page loads, and
 * `spin` (a `rotate(…)` tied to the scroll, see `scroll-transform.ts`) turns it in place. The hard
 * shadow sits on the outer box, which never turns, so the shadow stays down and to the right
 * while the part spins.
 */
export function BenchPart({
  className,
  tilt = 0,
  delay = 0,
  spin,
  children,
}: {
  className?: string;
  tilt?: number;
  delay?: number;
  spin?: ScrollTransform;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute drop-shadow-[5px_5px_0_var(--foreground)]",
        className,
      )}
      initial={reduce ? false : { opacity: 0, scale: 1.3 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 20, delay }}
    >
      <motion.div key={spin?.key} style={spin ? { transform: spin.value } : undefined}>
        <div style={{ rotate: `${tilt}deg` }}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

/** A two-blade prop seen from above, tips painted so you can see the disc when it spins. */
export function Propeller() {
  const tips = useId();
  const blade = "M -13 -14 C -38 -34 -34 -76 -15 -94 Q -2 -104 11 -95 C 22 -74 22 -36 13 -14 Z";
  return (
    <svg viewBox="-104 -104 208 208" className="block h-auto w-full">
      <clipPath id={tips}>
        <path d={blade} />
        <path d={blade} transform="rotate(180)" />
      </clipPath>
      {[0, 180].map((a) => (
        <path key={a} d={blade} transform={`rotate(${a})`} fill="var(--lead)" />
      ))}
      <g clipPath={`url(#${tips})`}>
        {[0, 180].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <rect x="-40" y="-104" width="80" height="24" fill="var(--primary)" />
            <path d="M -40 -80 H 40" {...ink} />
          </g>
        ))}
      </g>
      {[0, 180].map((a) => (
        <path key={a} d={blade} transform={`rotate(${a})`} fill="none" {...ink} />
      ))}
      <circle r="22" fill="var(--foreground)" />
      <circle r="9" fill="var(--panel)" {...ink} />
    </svg>
  );
}

/** A LiPo pack: sky-blue wrap, the red and black leads into a yellow XT60, and a balance plug. */
export function LipoPack() {
  return (
    <svg viewBox="0 0 330 150" className="block h-auto w-full">
      {/* balance lead and its white plug */}
      <path d="M 110 92 C 84 92 92 132 62 134" fill="none" {...ink} strokeWidth="7" />
      <rect x="34" y="124" width="30" height="18" rx="3" fill="var(--panel)" {...ink} />
      {/* main leads: black, then red */}
      <path
        d="M 110 66 C 76 66 74 112 40 108"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M 110 42 C 66 42 62 92 36 92"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M 110 42 C 66 42 62 92 36 92"
        fill="none"
        stroke="var(--lead)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* XT60: two pins, one chamfered corner so it only goes in one way */}
      <g transform="translate(26 100) rotate(-12)">
        <path d="M -22 -18 H 14 L 22 -10 V 18 H -22 Z" fill="var(--primary)" {...ink} />
        <circle cx="-6" cy="-6" r="5" fill="var(--foreground)" />
        <circle cx="-6" cy="8" r="5" fill="var(--foreground)" />
      </g>
      {/* the pack */}
      <rect x="108" y="10" width="218" height="104" rx="12" fill="var(--sky)" {...ink} />
      <path d="M 132 10 V 114" {...ink} />
      <rect
        x="108"
        y="10"
        width="24"
        height="104"
        rx="12"
        fill="var(--foreground)"
        opacity="0.15"
      />
      <rect x="146" y="30" width="124" height="64" rx="4" fill="var(--panel)" {...ink} />
      <path d="M 146 46 H 270" {...ink} />
      <rect x="147.5" y="31.5" width="121" height="13" rx="2.5" fill="var(--lead)" />
      <text
        x="208"
        y="83"
        textAnchor="middle"
        fontSize="30"
        fontWeight="900"
        fill="var(--foreground)"
        style={{ fontStretch: "125%" }}
      >
        LiPo
      </text>
    </svg>
  );
}

/** A 1/10 buggy wheel: pin-spike tyre, yellow dish rim with five holes, red hex nut. */
export function Wheel() {
  const pins = Array.from({ length: 24 }, (_, i) => i * 15);
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return `${(10 * Math.cos(a)).toFixed(2)},${(10 * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox="-64 -64 128 128" className="block h-auto w-full">
      {pins.map((a) => (
        <circle key={a} cy="-55" r="5" fill="var(--foreground)" transform={`rotate(${a})`} />
      ))}
      <circle r="56" fill="var(--foreground)" />
      <circle r="47" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" />
      <circle r="38" fill="var(--primary)" {...ink} />
      <circle r="27" fill="none" {...ink} strokeWidth="2" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cy="-19" r="6" fill="var(--foreground)" transform={`rotate(${a})`} />
      ))}
      <polygon points={hex} fill="var(--lead)" {...ink} />
      <circle r="3.5" fill="var(--foreground)" />
    </svg>
  );
}
