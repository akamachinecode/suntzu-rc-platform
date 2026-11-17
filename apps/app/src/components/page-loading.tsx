/**
 * What a data page shows while the server answers (its `loading.tsx`): the page's frame at about
 * the size of its header, so a click answers at once and nothing jumps when the page arrives.
 * Next.js prefetches it with the link (modern web guidance, performance/out-of-order-html-streaming).
 */
export function PageLoading({ what }: { what: string }) {
  return (
    <div className="mx-auto max-w-7xl px-5 pt-16 pb-12 sm:px-6 sm:pt-24">
      <p role="status" className="sr-only">
        Loading {what}…
      </p>
      <div aria-hidden="true" className="grid gap-6">
        <div className="h-12 w-3/4 max-w-2xl rounded-md bg-foreground/10 motion-safe:animate-pulse sm:h-16" />
        <div className="h-6 w-full max-w-xl rounded-md bg-foreground/10 motion-safe:animate-pulse" />
        <div className="mt-6 h-72 rounded-xl border-2 border-foreground/15 bg-foreground/5" />
      </div>
    </div>
  );
}
