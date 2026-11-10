/**
 * Turns one of the repository's Markdown documents into a portal page: the first `# heading`
 * becomes the title, the first paragraph the description, and every relative link points either
 * to another portal page or to the file on GitHub. Pure functions, tested in transform.test.ts.
 */
import path from "node:path";

/** `lead`: the description is the document's opening paragraph, shown under the title. */
export type Page = { title: string; description: string; lead: boolean; body: string };

/** Where a link to `repoPath` should go: another page (a path relative to the current page) or GitHub. */
export type Resolve = (repoPath: string) => string;

const FENCE = /^\s*(```|~~~)/;

/**
 * An inline code span (left alone), or a link or image whose text may itself contain code:
 * groups 2–4 are the start `[text](`, the target and the end `)` or ` "title")`.
 */
const INLINE = /(`+)[^`]*?\1|(!?\[(?:[^\]`]|`[^`]*`)*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;

/** Applies `fn` to every line that isn't inside a fenced code block. */
function mapProse(markdown: string, fn: (line: string) => string): string {
  let fenced = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (FENCE.test(line)) {
        fenced = !fenced;
        return line;
      }
      return fenced ? line : fn(line);
    })
    .join("\n");
}

function isRelative(target: string): boolean {
  return !/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target);
}

/** Rewrites the relative links of a document that lives at `sourcePath` (relative to the repository). */
export function rewriteLinks(markdown: string, sourcePath: string, resolve: Resolve): string {
  const dir = path.posix.dirname(sourcePath);
  const fix = (target: string): string => {
    if (!isRelative(target)) return target;
    const hash = target.indexOf("#");
    const file = hash === -1 ? target : target.slice(0, hash);
    const anchor = hash === -1 ? "" : target.slice(hash);
    if (!file) return target;
    const repoPath = path.posix.normalize(path.posix.join(dir, file)).replace(/\/$/, "");
    return resolve(repoPath) + anchor;
  };
  return mapProse(markdown, (line) => {
    const reference = /^(\s*\[[^\]]+\]:\s*)(\S+)(.*)$/.exec(line);
    if (reference) return `${reference[1]}${fix(reference[2]!)}${reference[3]}`;
    return line.replace(
      INLINE,
      (match: string, _ticks?: string, start?: string, target?: string, end?: string) =>
        start && target && end ? `${start}${fix(target)}${end}` : match,
    );
  });
}

/** Markdown inline syntax reduced to plain text, for titles and descriptions. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(text: string, max = 200): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** Splits a document into its title (first `# heading`), a description and the rest of the body. */
export function toPage(markdown: string, sourcePath: string): Page {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let fenced = false;
  let titleLine = -1;
  for (const [i, line] of lines.entries()) {
    if (FENCE.test(line)) fenced = !fenced;
    if (!fenced && /^# \S/.test(line)) {
      titleLine = i;
      break;
    }
  }
  if (titleLine === -1) {
    throw new Error(
      `${sourcePath} has no "# Title" line: every document needs one to become a page.`,
    );
  }
  const title = plainText(lines[titleLine]!.slice(2));
  const body = [...lines.slice(0, titleLine), ...lines.slice(titleLine + 1)].join("\n").trim();

  // The first paragraph becomes the description. When it opens the document and is short, the page
  // shows it under the title, so it leaves the body.
  const bodyLines = body.split("\n");
  const paragraph: string[] = [];
  let opens = true;
  let end = 0;
  for (const [i, line] of bodyLines.entries()) {
    if (!line.trim()) {
      if (paragraph.length) break;
      continue;
    }
    if (/^\s*([#|><]|[-*+]\s|\d+\.\s|```|~~~)/.test(line)) {
      if (paragraph.length) break;
      opens = false;
      continue;
    }
    paragraph.push(line);
    end = i + 1;
  }
  const full = plainText(paragraph.join(" "));
  // A long paragraph is shortened for the description, so it stays in the body to keep every word.
  const moves = opens && paragraph.length > 0 && full.length <= 200;
  const description = shorten(full);
  const rest = moves ? bodyLines.slice(end).join("\n").trim() : body;
  return { title, description, lead: moves, body: rest };
}

/** The page as a Markdown file with front matter. JSON strings are valid YAML. */
export function serialize(page: Page, sourcePath: string): string {
  const front = [
    `title: ${JSON.stringify(page.title)}`,
    `description: ${JSON.stringify(page.description)}`,
    `lead: ${page.lead}`,
    `source: ${JSON.stringify(sourcePath)}`,
  ];
  return `---\n${front.join("\n")}\n---\n\n${page.body}\n`;
}
