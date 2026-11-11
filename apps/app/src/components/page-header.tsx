import { cn } from "@/lib/utils";

/** The opening block of an inner page: a wide headline and a short lead. */
export function PageHeader({
  title,
  lead,
  className,
  children,
}: {
  title: string;
  lead: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("mx-auto max-w-7xl px-5 pt-16 pb-12 sm:px-6 sm:pt-24", className)}>
      <h1 className="max-w-4xl text-5xl leading-[0.92] font-black tracking-tight text-balance font-wide sm:text-7xl">
        {title}
      </h1>
      <p className="mt-6 max-w-[56ch] text-lg text-pretty sm:text-xl">{lead}</p>
      {children}
    </header>
  );
}
