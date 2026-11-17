import { MapPinOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MapLibre needs WebGL2. Without it (switched off, an older device, a remote desktop, a hardened
 * browser) its constructor throws, and an error thrown while mounting takes the whole page down.
 * Maps check first and show this note instead; everything a map shows is also written on the page.
 */
export function canDrawMaps(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export const MAP_UNAVAILABLE =
  "This browser can't draw the map (it needs WebGL, which is off or missing). Everything the map shows is also on this page.";

export function MapUnavailable({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-xl border-2 border-foreground bg-panel p-5 text-pretty",
        className,
      )}
    >
      <MapPinOffIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      {MAP_UNAVAILABLE}
    </p>
  );
}
