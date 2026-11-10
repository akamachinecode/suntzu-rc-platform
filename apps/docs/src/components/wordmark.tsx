import { cn } from "@workspace/ui/lib/utils";

/** The SunTzu RC wordmark (as in apps/app) followed by "docs". */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-baseline gap-1.5 whitespace-nowrap", className)}>
      <span className="leading-none font-black tracking-tight lowercase font-wide">suntzu rc</span>
      <span className="text-sm font-semibold text-muted-foreground">docs</span>
    </span>
  );
}
