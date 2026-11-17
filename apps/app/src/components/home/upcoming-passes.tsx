import { PitPasses } from "@/components/home/pit-passes";
import { getPublicApi } from "@/lib/api";

/**
 * The next three events with announced dates, as pit passes. It fetches on its own inside a
 * <Suspense> on the home, so the rest of the page (the headline first) streams without waiting
 * for the events API (modern web guidance, performance/out-of-order-html-streaming).
 */
export async function UpcomingPasses() {
  const { data } = await getPublicApi().GET("/events");
  const upcoming = (data ?? [])
    .filter((event) => event.datePrecision === "day" && event.status !== "cancelled")
    .slice(0, 3);
  return <PitPasses events={upcoming} />;
}

/** Where the passes will hang, about their size, while the events arrive. */
export function UpcomingPassesPlaceholder() {
  return <div aria-hidden="true" className="mt-12 h-96" />;
}
