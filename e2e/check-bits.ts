// Checks that every bit is documented and tested (part of `pnpm check`):
// - each docs/bits/<id>.md has a row in the catalog (docs/bits/README.md);
// - its "Test:" field names a test file that exists and mentions the bit's id,
//   or says `manual: <reason>` (allowed, but reported);
// - each `test.describe("<id>")` in e2e/ and each `@Bit("<id>")` in the code has a bit doc.
// Run it alone with `pnpm check:bits`.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const bitsDir = path.join(root, "docs", "bits");
const errors: string[] = [];
const notes: string[] = [];

const docs = readdirSync(bitsDir)
  .filter((name) => name.endsWith(".md") && name !== "README.md" && !name.startsWith("_"))
  .map((name) => name.slice(0, -".md".length));
const catalog = readFileSync(path.join(bitsDir, "README.md"), "utf8");

for (const id of docs) {
  const doc = `docs/bits/${id}.md`;
  if (!catalog.includes(`(./${id}.md)`))
    errors.push(`${doc}: no row in the catalog (docs/bits/README.md).`);

  const test = readFileSync(path.join(root, doc), "utf8")
    .match(/^- \*\*Test:\*\*(.*)$/m)?.[1]
    .trim();
  if (!test) {
    errors.push(`${doc}: missing the "- **Test:**" line.`);
  } else if (/^manual:/i.test(test)) {
    notes.push(`${id} is tested by hand (${test}).`);
  } else {
    const files = [...test.matchAll(/`([^`]+\.(?:ts|tsx))`/g)].map((match) => match[1]);
    if (!files.length)
      errors.push(
        `${doc}: "Test:" must name the test file (\`e2e/${id}.e2e.ts\`) or say "manual: <reason>".`,
      );
    for (const file of files) {
      const full = path.join(root, file);
      if (!existsSync(full)) errors.push(`${doc}: test file ${file} doesn't exist.`);
      else if (!readFileSync(full, "utf8").includes(id))
        errors.push(`${file} doesn't mention "${id}" (use test.describe("${id}", …)).`);
    }
  }
}

// Bits named in tests and in the code must be documented too.
const SKIP = new Set([
  "node_modules",
  "dist",
  ".next",
  ".astro",
  "test-results",
  "playwright-report",
  "coverage",
]);
function sourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name) || name.startsWith(".")) return [];
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}
const named = [
  ...sourceFiles(path.join(root, "e2e")).map((file) => ({
    file,
    pattern: /test\.describe\("([a-z0-9-]+\.[a-z0-9.-]+)"/g,
  })),
  ...["src", "apps"]
    .flatMap((dir) => sourceFiles(path.join(root, dir)))
    .map((file) => ({ file, pattern: /@Bit\("([^"]+)"\)/g })),
];
for (const { file, pattern } of named) {
  for (const [, id] of readFileSync(file, "utf8").matchAll(pattern)) {
    if (!docs.includes(id))
      errors.push(
        `${path.relative(root, file)} names bit "${id}", which has no docs/bits/${id}.md.`,
      );
  }
}

for (const note of notes) console.log(`note: ${note}`);
if (errors.length) {
  console.error(`Bits check failed:\n${errors.map((error) => `  - ${error}`).join("\n")}`);
  console.error(
    "Every bit needs a doc in docs/bits/, a row in its catalog and a test. See docs/bits/README.md.",
  );
  process.exit(1);
}
console.log(`Bits check passed: ${docs.length} bit(s) documented and tested.`);
