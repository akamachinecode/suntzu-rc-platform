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

export default async function CanIFlyHerePage() {
  const { data: places } = await getPublicApi().GET("/places");
  return (
    <>
      <PageHeader
        title="Can I fly here?"
        lead="Tap a spot and get a plain answer: controlled airspace, an airport nearby or an FAA-recognised field, and what that means for you. For planes, helicopters and drones flown for fun."
      />
      <section aria-label="Check a point" className="mx-auto max-w-7xl px-4 pb-24">
        <Checker places={places ?? []} />
      </section>
    </>
  );
}
