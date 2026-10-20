"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useRef, useState } from "react";

export interface Milestone {
  year: string;
  title: string;
  body: string;
  source?: { label: string; href: string };
}

/**
 * A history told on scroll: a giant year stays pinned beside the list and
 * changes as each milestone reaches the middle of the screen.
 */
export function Timeline({ items, label }: { items: Milestone[]; label: string }) {
  const track = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: track, offset: ["start center", "end center"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const year = items[active]?.year ?? "";

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-16">
      <div className="sticky top-[4.5rem] z-10 self-start md:top-24" aria-hidden="true">
        <div className="relative overflow-hidden rounded-xl border-2 border-foreground bg-foreground px-5 py-4 text-primary shadow-[6px_6px_0_0_var(--primary)] md:px-6 md:py-8 md:shadow-[10px_10px_0_0_var(--primary)]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={year}
              initial={reduce ? false : { y: "60%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? undefined : { y: "-60%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="text-5xl leading-none font-black font-wide tabular-nums sm:text-8xl lg:text-9xl"
            >
              {year}
            </motion.p>
          </AnimatePresence>
          <p className="mt-2 max-w-[30ch] text-sm font-semibold text-background md:mt-4 md:text-base">
            {items[active]?.title}
          </p>
          <div className="mt-3 h-2 rounded-full bg-background/20 md:mt-6">
            <motion.div
              style={{ scaleX: progress }}
              className="h-full origin-left rounded-full bg-primary"
            />
          </div>
        </div>
      </div>

      <ol ref={track} aria-label={label} className="grid gap-6">
        {items.map((item, index) => (
          <motion.li
            key={`${item.year}-${item.title}`}
            onViewportEnter={() => setActive(index)}
            viewport={{ margin: "-45% 0px -45% 0px" }}
            className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard data-[active=true]:bg-primary"
            data-active={index === active}
          >
            <p className="text-2xl font-black font-wide tabular-nums">{item.year}</p>
            <h3 className="mt-1 text-xl font-bold text-balance">{item.title}</h3>
            <p className="mt-2 text-pretty">{item.body}</p>
            {item.source ? (
              <p className="mt-3 text-sm">
                <a
                  href={item.source.href}
                  className="underline underline-offset-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.source.label}
                </a>
              </p>
            ) : null}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
