/**
 * The Learn page's own words: what each service shows beside it, and the questions people ask
 * before a first lesson. The services themselves (titles, points) are in
 * `@workspace/shared` (`SERVICES`), shared with the contact form.
 *
 * Every answer restates something the site already says (the services, the steps, the rules in
 * `@workspace/shared`) or links to where it's sourced. No prices: the owner decided on
 * 2026-11-11 that people ask and the crew answers (docs/specs/0008-phones-and-learn.md).
 */

export const LEARN_ASK: Record<string, string> = {
  lessons: "Book a lesson",
  "first-model": "Help me pick a model",
  advanced: "Ask about a course",
  connect: "Ask about the scene",
  rules: "Ask about the rules",
};

export const LEARN_FAQ = [
  {
    question: "Do I need my own model?",
    answer:
      "No. Lessons work with your model or ours. If you're about to buy one, we'll help you choose it first, so the first one is a model you'll keep flying.",
  },
  {
    question: "I've never flown or driven anything. Is that a problem?",
    answer:
      "Not at all: that's where everyone starts. Planes start on a buddy box, our transmitter linked to yours so we can take over in a heartbeat. Helicopters start with hovering, one control at a time, and cars with throttle control and lines.",
  },
  {
    question: "What does it cost?",
    answer:
      "It depends on what you want to do and where. Tell us, and we'll tell you what it costs before anything is booked. Asking is free.",
  },
  {
    question: "Where do lessons happen?",
    answer:
      "At a real field or track in South Florida, somewhere between Palm Beach and the Keys. We pick one that suits what you fly and where you are.",
  },
  {
    question: "Do I need anything from the FAA?",
    answer:
      "For planes and helicopters, yes: the FAA's free TRUST test, and a $5 registration for anything 250 g or heavier. Cars need nothing. We'll walk you through both.",
    link: { href: "/guides/flying-legally", label: "Flying legally, step by step" },
  },
] as const;
