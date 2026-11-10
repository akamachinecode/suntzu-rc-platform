import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { Provider } from "@/components/provider";
import { baseOptions } from "@/lib/layout";
import { SITE } from "@/lib/site";
import { source } from "@/lib/source";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} antialiased`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <Provider>
          <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
            {children}
          </DocsLayout>
        </Provider>
      </body>
    </html>
  );
}
