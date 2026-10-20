import { ArrowRightIcon, DatabaseIcon, LockIcon, ServerIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE } from "@/lib/site";

const features = [
  {
    icon: ServerIcon,
    title: "Server first",
    description: "Pages render on the server. Only interactive pieces ship JavaScript.",
  },
  {
    icon: LockIcon,
    title: "Safe mutations",
    description: "Forms post to Server Actions that validate every input with Zod.",
  },
  {
    icon: DatabaseIcon,
    title: "Ready to grow",
    description: "Database, auth and email follow the Itaca standard choices in AGENTS.md.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-24 sm:py-32">
        <Badge variant="secondary">Welcome</Badge>
        <h1 className="max-w-3xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          {SITE.name}
        </h1>
        <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
          This is the starting point of your application. Replace this page with the first screen
          your users should see.
        </p>
        <Button asChild size="lg">
          <Link href="/contact">
            Try the example form <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </section>
      <section aria-labelledby="features" className="mx-auto max-w-6xl px-4 pb-24">
        <h2 id="features" className="sr-only">
          Features
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="mb-2 size-6 text-muted-foreground" aria-hidden="true" />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
