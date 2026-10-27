import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StopButton } from "./stop-button";

export const metadata: Metadata = {
  title: "Stop emails",
  description: "Stop Servo's change alerts, weekly email or monthly club report.",
  robots: { index: false },
};

const LABELS: Record<string, string> = {
  alerts: "change alerts",
  digest: "the weekly email",
  report: "the monthly club report",
};

export default async function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  const { token, what } = await searchParams;
  const label = typeof what === "string" ? LABELS[what] : undefined;
  return (
    <>
      <PageHeader
        title="Fewer emails."
        lead="One click and they stop. Everything else in your account stays as it is."
      />
      <section className="mx-auto max-w-7xl px-4 pb-24">
        {typeof token === "string" && typeof what === "string" && label ? (
          <StopButton token={token} what={what} label={label} />
        ) : (
          <p className="text-lg">This link is incomplete. Change your emails in My Servo.</p>
        )}
      </section>
    </>
  );
}
