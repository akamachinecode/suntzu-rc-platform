import Link from "next/link";
import { Button } from "@workspace/ui/components/button";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-32">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        The page you are looking for doesn&apos;t exist or has moved.
      </p>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </section>
  );
}
