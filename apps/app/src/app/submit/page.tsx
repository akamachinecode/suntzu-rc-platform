import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SubmitForm } from "./submit-form";

export const metadata: Metadata = {
  title: "Send us an event",
  description:
    "Know about an RC fly-in, race or swap meet in Florida that isn't on SunTzu RC? Paste the link or the flyer.",
};

export default function SubmitPage() {
  return (
    <>
      <PageHeader
        title="Know about an event?"
        lead="Paste the link or the flyer. We read it, check it against the source, and put it on the calendar with your help credited. Run the club? Publish it yourself from your club's page."
      />
      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-24 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard sm:p-8">
          <SubmitForm />
        </div>
        <aside className="grid content-start gap-4 text-pretty">
          <h2 className="text-2xl font-black font-wide">How it works</h2>
          <p>
            A link to a club page, a calendar or a race listing is read straight away, politely and
            only if the site allows it.
          </p>
          <p>
            Pasted text is read by AI that must quote the flyer for every detail; anything it
            can&apos;t quote is left out.
          </p>
          <p>
            Either way, the crew checks it before it goes live. If it&apos;s already on SunTzu RC,
            your link counts as one more source.
          </p>
          <p>
            Organisers:{" "}
            <Link href="/organise" className="font-semibold underline underline-offset-4">
              claim your club
            </Link>{" "}
            and your events go live without waiting.
          </p>
        </aside>
      </section>
    </>
  );
}
