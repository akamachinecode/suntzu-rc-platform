import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { TOPICS, type Topic } from "@workspace/shared";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Book a session",
  description:
    "Ask the Servo crew about lessons, a first model, advanced courses, local clubs and FAA rules in South Florida.",
};

const isTopic = (value: unknown): value is Topic => TOPICS.some((topic) => topic.value === value);

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const { topic } = await searchParams;
  return (
    <>
      <PageHeader
        title="Tell us what you want to do."
        lead="Lessons, a first model, a course, a club to join or a rule you're unsure about. Write a few lines and one of us will get back to you."
      />
      <section className="mx-auto max-w-7xl px-4 pb-24">
        <div className="max-w-2xl rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard-lg sm:p-10">
          <ContactForm topic={isTopic(topic) ? topic : undefined} />
        </div>
      </section>
    </>
  );
}
