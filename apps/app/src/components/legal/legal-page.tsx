import { PageHeader } from "@/components/page-header";

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

/** A plain-language legal page: one heading per topic, short paragraphs, the date it changed. */
export function LegalPage({
  title,
  lead,
  updated,
  sections,
}: {
  title: string;
  lead: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <PageHeader title={title} lead={lead} />
      <article className="mx-auto max-w-3xl px-4 pb-24">
        <p className="text-sm text-muted-foreground">Last updated {updated}.</p>
        {sections.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-2xl font-black font-wide">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="mt-3 max-w-[68ch] text-lg text-pretty">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </>
  );
}
