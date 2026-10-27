import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "The rules for using Servo: free, as it is, and always check with the organiser.",
};

// Plain-language terms written for launch (docs/specs/0004-launch.md). The owner should have them
// reviewed before Servo goes public; see docs/LAUNCH.md.
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      lead="Servo is free for everyone who flies, drives and races RC. These are the few rules that keep it useful."
      updated="October 27, 2026"
      sections={[
        {
          title: "Check with the organiser",
          paragraphs: [
            "We work hard to keep events and places right, and every page says where its information comes from and when we last checked it. Things still change: always check the organiser's own page before you travel.",
          ],
        },
        {
          title: "Flying is your responsibility",
          paragraphs: [
            "\"Can I fly here?\" and the rules on our pages are guidance from public FAA data, not legal advice and not an authorisation. Follow the FAA's rules, the field's rules and the law wherever you fly. Use LAANC and B4UFLY before flying near airports.",
          ],
        },
        {
          title: "What you send us",
          paragraphs: [
            "When you add or correct an event, you tell us it's accurate as far as you know. Facts such as dates and places become part of the public calendar. Organisers who publish on Servo keep their events current and cancel them here if they're cancelled.",
            "Don't send anything that isn't yours to share, and don't use Servo to spam, mislead or harass anyone. We may remove content or accounts that do.",
          ],
        },
        {
          title: "Free, as it is",
          paragraphs: [
            "Taking part in Servo is free. The service is provided as it is, without guarantees that it will always be available or error-free. To the extent the law allows, we're not liable for losses that come from relying on it.",
          ],
        },
        {
          title: "Changes",
          paragraphs: [
            "If these terms change in a way that matters, we'll say so on the site and, if you have an account, by email, before the change applies.",
          ],
        },
      ]}
    />
  );
}
