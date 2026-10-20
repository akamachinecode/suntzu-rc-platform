import type { Metadata } from "next";
import Link from "next/link";
import { Prose, SectionTitle, Wide } from "@/components/guides/prose";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AMA, FAA_RULES, FLORIDA_RULES, PARK_RULES, type Rule } from "@/content/rules";

export const metadata: Metadata = {
  title: "Flying RC legally in South Florida",
  description:
    "FAA TRUST, registration, Remote ID and airspace around Miami, Florida's drone statutes and county park rules for RC pilots, with links to every source.",
};

function RuleList({ rules }: { rules: Rule[] }) {
  return (
    <ul className="mt-10 grid gap-6 md:grid-cols-2">
      {rules.map((rule) => (
        <li
          key={rule.title}
          className="rounded-xl border-2 border-foreground bg-panel p-6 shadow-hard"
        >
          <h3 className="text-xl font-bold text-balance">{rule.title}</h3>
          <p className="mt-2 text-pretty">{rule.body}</p>
          <a
            href={rule.source.href}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
          >
            {rule.source.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function FlyingLegallyPage() {
  return (
    <article>
      <PageHeader
        title="Flying legally in South Florida."
        lead="Most of it takes an evening: a free test, a $5 registration and a club. Here's the whole picture as of October 2026, with a link to every rule. It's a summary, not legal advice."
      />
      <Wide className="pb-20">
        <SectionTitle id="faa">The FAA basics</SectionTitle>
        <RuleList rules={FAA_RULES} />
      </Wide>
      <section className="border-y-2 border-foreground bg-panel py-20">
        <Wide>
          <SectionTitle id="florida">Florida law</SectionTitle>
          <p className="mt-5 max-w-[60ch] text-lg text-pretty">
            Florida&apos;s statutes say &quot;drone&quot;, and they define it as any powered
            aircraft without a pilot on board. That very likely includes your RC plane.
          </p>
          <RuleList rules={FLORIDA_RULES} />
        </Wide>
      </section>
      <Wide className="py-20">
        <SectionTitle id="parks">County parks</SectionTitle>
        <RuleList rules={PARK_RULES} />
      </Wide>
      <section className="pb-24">
        <Prose>
          <h2 id="ama" className="text-2xl font-bold">
            Why most of us join the AMA
          </h2>
          <p className="mt-3">
            {AMA.body}{" "}
            <a href={AMA.source.href} target="_blank" rel="noreferrer">
              {AMA.source.label}
            </a>
            .
          </p>
          <p>
            Want help with any of it? We&apos;ll sit down with you, take the test, register and set
            up your Remote ID, then take you to a field.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/contact?topic=rules">Get help with the rules</Link>
            </Button>
          </div>
        </Prose>
      </section>
    </article>
  );
}
