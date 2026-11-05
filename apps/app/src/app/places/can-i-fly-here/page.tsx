import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getPublicApi } from "@/lib/api";
import { Checker } from "./checker";

export const metadata: Metadata = {
  title: "Can I fly my drone or RC plane here?",
  description:
    "Tap a spot in Florida and see whether it's in controlled airspace, near an airport or at an FAA-recognised field, with the rules that apply. Free, no sign-up.",
};

export const dynamic = "force-dynamic";

// "?at=25.8576,-80.2781": a spot to check at once (a town or ZIP code from search).
function spot(value: string | string[] | undefined): [number, number] | undefined {
  const match =
    typeof value === "string" && /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(value);
  if (!match) return undefined;
  const [latitude, longitude] = [Number(match[1]), Number(match[2])];
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? [longitude, latitude] : undefined;
}

export default async function CanIFlyHerePage({
  searchParams,
}: PageProps<"/places/can-i-fly-here">) {
  const initial = spot((await searchParams).at);
  const { data: places } = await getPublicApi().GET("/places");
  return (
    <>
      <PageHeader
        title="Can I fly here?"
        lead="Tap a spot and get a plain answer: controlled airspace, an airport nearby or an FAA-recognised field, and what that means for you. For planes, helicopters and drones flown for fun."
      />
      <section aria-label="Check a point" className="mx-auto max-w-7xl px-4 pb-24">
        <Checker places={places ?? []} {...(initial && { initial })} />
      </section>
    </>
  );
}
