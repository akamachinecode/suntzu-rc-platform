import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Servo stores about you, why, for how long, and how to delete it.",
};

// Plain-language policy written for launch (docs/specs/0004-launch.md). The owner should have it
// reviewed before Servo goes public; see docs/LAUNCH.md.
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      lead="The short version: we keep as little as we can, nothing about you is public, and you can delete your account whenever you like."
      updated="October 29, 2026"
      sections={[
        {
          title: "Browsing Servo",
          paragraphs: [
            "You don't need an account to read the calendar, the places or the guides. We don't use advertising or tracking cookies, and we don't sell or share data with advertisers.",
            '"Near me" works out distances in your browser: your location is never sent to us. "Can I fly here?" sends us the point you choose so we can check it; we don\'t store or log it.',
            "Our hosting keeps standard technical logs (the page asked for, the time, a request number) to keep the site running and safe. They don't include your name or email.",
          ],
        },
        {
          title: "Searching",
          paragraphs: [
            "We don't keep a history of what you search for, and searches are never linked to your account. When a search finds nothing (or nothing that matches all its words), we count its words for that day, only the words and the number of results, so we know which events and places to add. Searches that look like an email, a phone number or a street address are never counted. The counts are deleted after 90 days.",
            "Your last few searches are kept on your own device, in your browser, so search can show them again. They never reach us; clearing your browser's site data removes them.",
          ],
        },
        {
          title: "If you create an account",
          paragraphs: [
            "We keep your email address (to sign you in and, if you ask for them, to send alerts and the weekly email), and optionally a name and a home ZIP code you give us. We keep what you follow and the events you say you're going to.",
            'None of this is public. Event and club pages only show counts, such as "12 going", never who.',
            "Signing in with Google gives us your name and email from Google, nothing else.",
          ],
        },
        {
          title: "Emails",
          paragraphs: [
            'We send sign-in links when you ask for one. Change alerts and the weekly "this weekend near you" email are on or off in My Servo, and every one of them has a one-click link to stop it.',
            "Emails are sent through Amazon Web Services (Amazon SES).",
          ],
        },
        {
          title: 'Messages, corrections and "try it"',
          paragraphs: [
            "When you write to us, share a build or suggest a correction, we keep your message, name and email so the crew can reply. We delete messages after 12 months.",
            "When you ask to try RC, we send your name, email and message only to the organisers of the nearest clubs that welcome newcomers, and only with your OK. We delete the request after 12 months.",
          ],
        },
        {
          title: "Organisers",
          paragraphs: [
            "If you claim a club, we email a one-time code to an address at the club's domain, or look for a code on the club's website, to check you run it. Other members never see your email.",
          ],
        },
        {
          title: "Deleting your data",
          paragraphs: [
            'Delete your account from My Servo at any time: your email, settings, follows and "going" are deleted at once. Events and corrections you gave to the public calendar stay, without your name.',
            "To ask what we hold about you, or for anything else about your data, write to us through the contact page.",
          ],
        },
        {
          title: "Where the facts come from",
          paragraphs: [
            "Event and place pages are built from organisers' own websites and calendars and from public records (FAA and US Census data). We keep dates, places and links, and never the personal contact details those pages may contain.",
          ],
        },
      ]}
    />
  );
}
