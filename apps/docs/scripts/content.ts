/**
 * Builds the portal's pages (content/docs/) from the repository's own documents, so there is one
 * source of truth: edit docs/, never content/. Runs before every dev, build and typecheck.
 * Every Markdown file in docs/ becomes a page; one this file doesn't place lands in "More".
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { githubUrl } from "../src/lib/site.ts";
import { rewriteLinks, serialize, toPage } from "./transform.ts";

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(app, "../..");
const out = path.join(app, "content/docs");

type Section = { folder: string; title: string; files: Record<string, string> };

/** Where each document goes: repository path → page name inside the section's folder. */
const SECTIONS: Section[] = [
  {
    folder: "",
    title: "",
    files: { "README.md": "index" },
  },
  {
    folder: "contributing",
    title: "Contributing",
    files: {
      "CONTRIBUTING.md": "index",
      "AGENTS.md": "rules",
      "CODE_OF_CONDUCT.md": "code-of-conduct",
      "SECURITY.md": "security",
    },
  },
  {
    folder: "architecture",
    title: "Architecture",
    files: { "docs/SYSTEM.md": "system", "docs/EVENTS-ENGINE.md": "events-engine" },
  },
  {
    folder: "operations",
    title: "Operations",
    files: {
      "docs/OPERATIONS.md": "operations",
      "docs/LAUNCH.md": "launch",
      "docs/DEPLOY.md": "deploy",
      "docs/TERRAFORM.md": "terraform",
      "docs/AWS-GITHUB-OIDC.md": "aws-github-oidc",
      "docs/CLOUDFLARE.md": "cloudflare",
      "docs/GITHUB.md": "github",
    },
  },
  {
    folder: "project",
    title: "Project",
    files: {
      "docs/LANDSCAPE.md": "landscape",
      "docs/ROADMAP.md": "roadmap",
      "docs/DISCOVERY.md": "discovery",
      "docs/DECISIONS.md": "decisions",
    },
  },
  { folder: "specs", title: "Specifications", files: { "docs/specs/README.md": "index" } },
  { folder: "bits", title: "Bits", files: { "docs/bits/README.md": "index" } },
  { folder: "more", title: "More", files: {} },
];

const TITLES: Record<string, string> = {
  "README.md": "SunTzu RC",
  "AGENTS.md": "Rules for people and agents",
};

/** Page names can't contain dots: Fumadocs reads `name.xx.md` as a translation. */
const pageName = (file: string): string =>
  path
    .basename(file, ".md")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

function markdownFiles(dir: string): string[] {
  return fs
    .readdirSync(path.join(root, dir))
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort()
    .map((f) => `${dir}/${f}`);
}

// Specs and bits: every file in their folder, in name order.
for (const [folder, dir] of [
  ["specs", "docs/specs"],
  ["bits", "docs/bits"],
] as const) {
  const section = SECTIONS.find((s) => s.folder === folder)!;
  for (const file of markdownFiles(dir)) section.files[file] ??= pageName(file);
}

// Anything else in docs/ that isn't placed above.
const placed = new Set(SECTIONS.flatMap((s) => Object.keys(s.files)));
const more = SECTIONS.find((s) => s.folder === "more")!;
for (const file of markdownFiles("docs")) if (!placed.has(file)) more.files[file] = pageName(file);

/** Repository path → path of its page inside content/docs. */
const pages = new Map<string, string>();
for (const section of SECTIONS) {
  for (const [file, name] of Object.entries(section.files)) {
    pages.set(file, path.posix.join(section.folder, `${name}.md`));
  }
}

fs.rmSync(path.join(app, "content"), { recursive: true, force: true });

for (const [file, target] of pages) {
  const resolve = (repoPath: string): string => {
    // A folder whose README is a page (docs/specs, docs/bits) links to that page.
    const page = pages.get(repoPath) ?? pages.get(`${repoPath}/README.md`);
    if (page) return path.posix.relative(path.posix.dirname(target), page).replace(/^(?!\.)/, "./");
    const full = path.join(root, repoPath);
    const isDir = fs.existsSync(full) && fs.statSync(full).isDirectory();
    return githubUrl(repoPath, isDir ? "tree" : "blob");
  };
  const page = toPage(fs.readFileSync(path.join(root, file), "utf8"), file);
  if (TITLES[file]) page.title = TITLES[file];
  page.body = rewriteLinks(page.body, file, resolve);
  fs.mkdirSync(path.dirname(path.join(out, target)), { recursive: true });
  fs.writeFileSync(path.join(out, target), serialize(page, file));
}

// Sidebar order: one meta.json per folder.
const write = (folder: string, meta: object) =>
  fs.writeFileSync(path.join(out, folder, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
const sections = SECTIONS.filter((s) => s.folder && Object.keys(s.files).length);
write("", { pages: ["index", ...sections.map((s) => s.folder)] });
for (const section of sections) {
  write(section.folder, { title: section.title, pages: Object.values(section.files) });
}

console.log(`docs portal: ${pages.size} pages written to ${path.relative(root, out)}/`);
