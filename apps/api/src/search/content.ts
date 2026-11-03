// The site's own pages as search documents: guides, rules and services from @workspace/shared.
// Events, places and clubs are written by database triggers instead (migration 0008).
import { AMA, FAA_RULES, FLORIDA_RULES, GUIDES, PARK_RULES, SERVICES } from "@workspace/shared";

export interface ContentDocument {
  id: string;
  type: "guide" | "rule" | "service";
  title: string;
  subtitle: string;
  body: string;
  url: string;
  weight: number;
}

const LEGAL = "/guides/flying-legally";

export function contentDocuments(): ContentDocument[] {
  const guides = GUIDES.map((guide) => ({
    id: `guide:${guide.href.split("/").pop()}`,
    type: "guide" as const,
    title: guide.title,
    subtitle: `Guide · ${guide.minutes} min`,
    body: [guide.dek, ...guide.sections.map((section) => section.title)].join(" "),
    url: guide.href,
    weight: 3,
  }));
  const rules = (
    [
      ["FAA", "faa", FAA_RULES],
      ["Florida", "florida", FLORIDA_RULES],
      ["County parks", "parks", PARK_RULES],
    ] as const
  ).flatMap(([group, anchor, list]) =>
    list.map((rule) => ({
      id: `rule:${rule.id}`,
      type: "rule" as const,
      title: rule.title,
      subtitle: `Rule · ${group}`,
      body: rule.body,
      url: `${LEGAL}#${anchor}`,
      weight: 2,
    })),
  );
  const ama: ContentDocument = {
    id: "rule:ama",
    type: "rule",
    title: "Why most of us join the AMA",
    subtitle: "Rule · AMA membership",
    body: `Academy of Model Aeronautics ${AMA.body}`,
    url: `${LEGAL}#ama`,
    weight: 2,
  };
  const services = SERVICES.map((service) => ({
    id: `service:${service.id}`,
    type: "service" as const,
    title: service.title,
    subtitle: `Servo crew · ${service.short}`,
    body: [service.tag, service.lead, ...service.points].join(" "),
    url: `/learn#${service.id}`,
    weight: 1,
  }));
  return [...guides, ...rules, ama, ...services];
}
