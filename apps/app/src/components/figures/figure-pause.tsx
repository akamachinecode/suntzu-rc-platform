"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { asksForStillness, useStillness } from "@/components/iso/react/live";

/**
 * Anything that moves by itself for more than five seconds needs a visible way to pause it, even
 * for people who haven't asked their device for reduced motion (WCAG 2.2.2; modern web guidance,
 * ui-behaviors/motion). A figure's idle tour is such a thing.
 *
 * The button lives in the figure's frame, beside the readout, not on the drawing: the drawing is
 * a slider, and a slider's content isn't a place for another control. `FigureFrame` provides the
 * state; a figure that tours calls `useFigurePause()`, which shows the button and tells it when
 * to stand still.
 */
type Pause = { paused: boolean; pausable: boolean; toggle: () => void; register: () => () => void };

const PauseContext = createContext<Pause | null>(null);

export function FigurePause({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [figures, setFigures] = useState(0);
  const register = useCallback(() => {
    setFigures((count) => count + 1);
    return () => setFigures((count) => count - 1);
  }, []);
  const value = useMemo(
    () => ({
      paused,
      pausable: figures > 0,
      toggle: () => setPaused((now) => !now),
      register,
    }),
    [paused, figures, register],
  );
  return <PauseContext value={value}>{children}</PauseContext>;
}

/**
 * For a figure that moves by itself. `paused` is for effects (a paused figure starts no tour);
 * `still()` is for the animation loop: true when the visitor asked for reduced motion or pressed
 * Pause, so the figure settles and stops.
 */
export function useFigurePause() {
  const context = useContext(PauseContext);
  const register = context?.register;
  useEffect(() => register?.(), [register]);
  const paused = context?.paused ?? false;
  const latest = useRef(paused);
  useEffect(() => {
    latest.current = paused;
  }, [paused]);
  const still = useCallback(() => asksForStillness() || latest.current, []);
  return { paused, still };
}

/** The frame's Pause/Play button. Hidden when the figure doesn't tour or nothing moves anyway. */
export function PauseToggle() {
  const context = useContext(PauseContext);
  const calm = useStillness();
  if (!context?.pausable || calm) return null;
  const { paused, toggle } = context;
  return (
    <button
      type="button"
      onClick={toggle}
      className="tap inline-flex min-h-8 items-center gap-1.5 rounded-full border-2 border-foreground bg-panel px-3 py-1 text-sm font-semibold shadow-hard-sm"
    >
      {paused ? (
        <PlayIcon aria-hidden="true" className="size-3.5" />
      ) : (
        <PauseIcon aria-hidden="true" className="size-3.5" />
      )}
      {paused ? "Play" : "Pause"}
      <span className="sr-only"> the animation</span>
    </button>
  );
}
