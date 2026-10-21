import { cn } from "@/lib/utils";

/** The Servo wordmark: lowercase Archivo at full width and weight, like a body-shell decal. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("leading-none font-black tracking-tight lowercase font-wide", className)}>
      servo
    </span>
  );
}
