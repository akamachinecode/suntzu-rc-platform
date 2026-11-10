import { loader } from "fumadocs-core/source";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";

// content/docs is written by scripts/content.ts from the repository's documents.
const docs = defineDocs({
  dir: "content/docs",
  docs: {
    // `source`: the document's path in the repository, for "Edit on GitHub". `lead`: the
    // description is the opening paragraph, shown under the title (otherwise only for search engines).
    schema: pageSchema.extend({ source: z.string(), lead: z.boolean() }),
  },
  meta: { schema: metaSchema },
});

export const source = loader({
  baseUrl: "/",
  source: docs.toFumadocsSource(),
});
