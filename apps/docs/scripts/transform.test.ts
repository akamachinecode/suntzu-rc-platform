import assert from "node:assert/strict";
import { test } from "node:test";
import { plainText, rewriteLinks, serialize, toPage } from "./transform.ts";

const pages: Record<string, string> = {
  "docs/DEPLOY.md": "../operations/deploy.md",
  "CONTRIBUTING.md": "../contributing/index.md",
};
const resolve = (repoPath: string) =>
  pages[repoPath] ?? `https://github.com/x/y/blob/main/${repoPath}`;

test("links to other documents become portal pages, keeping the anchor", () => {
  assert.equal(
    rewriteLinks("See [deploy](./DEPLOY.md#secrets).", "docs/SYSTEM.md", resolve),
    "See [deploy](../operations/deploy.md#secrets).",
  );
});

test("links to code become GitHub links, also when the text is code", () => {
  assert.equal(
    rewriteLinks("[`apps/app`](./apps/app) and [jobs](../infra/jobs.tf)", "docs/X.md", resolve),
    "[`apps/app`](https://github.com/x/y/blob/main/docs/apps/app) and [jobs](https://github.com/x/y/blob/main/infra/jobs.tf)",
  );
});

test("web links, anchors, inline code and code blocks are left alone", () => {
  const markdown = [
    "[site](https://www.suntzurc.com) [top](#pieces) `[x](./DEPLOY.md)`",
    "```md",
    "[x](./DEPLOY.md)",
    "```",
  ].join("\n");
  assert.equal(rewriteLinks(markdown, "docs/SYSTEM.md", resolve), markdown);
});

test("reference links and link titles are rewritten", () => {
  assert.equal(
    rewriteLinks('[c]: ../CONTRIBUTING.md\n[d](./DEPLOY.md "Deploy")', "docs/A.md", resolve),
    '[c]: ../contributing/index.md\n[d](../operations/deploy.md "Deploy")',
  );
});

test("the first heading is the title and the first paragraph the description", () => {
  const page = toPage(
    "# `System` map\n\n- **Status:** x\n\nWhat runs [where](./a.md).\nAnd how.\n\n## Pieces",
    "docs/SYSTEM.md",
  );
  assert.equal(page.title, "System map");
  assert.equal(page.description, "What runs where. And how.");
  assert.ok(!page.body.includes("# `System`"));
  assert.ok(page.body.includes("What runs"), "a paragraph after a list stays in the body");
});

test("an opening paragraph moves to the description instead of showing twice", () => {
  const page = toPage("# System\n\nWhat runs where.\n\n## Pieces", "docs/SYSTEM.md");
  assert.equal(page.description, "What runs where.");
  assert.equal(page.body, "## Pieces");
  assert.equal(page.lead, true);

  const long = `${"word ".repeat(60)}end.`;
  const kept = toPage(`# Long\n\n${long}\n\n## Next`, "docs/LONG.md");
  assert.ok(kept.description.endsWith("…"));
  assert.ok(kept.body.startsWith(long), "a shortened paragraph stays whole in the body");
  assert.equal(kept.lead, false);
});

test("a document without a title stops the build", () => {
  assert.throws(() => toPage("No title here", "docs/BAD.md"), /docs\/BAD\.md has no "# Title"/);
});

test("front matter is quoted safely", () => {
  const file = serialize(
    { title: 'A "quoted": title', description: "", lead: false, body: "Body" },
    "docs/A.md",
  );
  assert.match(file, /^---\ntitle: "A \\"quoted\\": title"\n/);
  assert.equal(plainText("**bold** and _it_"), "bold and it");
});
