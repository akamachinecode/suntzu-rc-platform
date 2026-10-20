import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send us a message.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-xl px-4 py-16">
      <h1 className="mb-2 font-heading text-4xl font-semibold tracking-tight">Contact</h1>
      <p className="mb-8 text-muted-foreground">
        Example of a form handled by a Server Action with Zod validation.
      </p>
      <ContactForm />
    </section>
  );
}
