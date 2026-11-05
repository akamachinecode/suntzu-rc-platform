// robots.txt rules (RFC 9309): the group for our user agent, or "*" when there is none; the
// longest matching rule wins and Allow wins a tie. `*` matches anything, `$` ends the path.
// Crawl-delay and Request-rate aren't in the RFC, but sites that set them get the slower one.

export interface RobotsRules {
  allows(path: string): boolean;
  crawlDelaySeconds?: number;
}

interface Group {
  agents: string[];
  rules: { allow: boolean; pattern: string }[];
  crawlDelaySeconds?: number;
}

export const ALLOW_ALL: RobotsRules = { allows: () => true };
export const DISALLOW_ALL: RobotsRules = { allows: () => false };

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const source = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}${anchored ? "$" : ""}`).test(path);
}

export function parseRobots(text: string, userAgent: string): RobotsRules {
  const groups: Group[] = [];
  let current: Group | undefined;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === "user-agent") {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      // An empty Disallow allows everything.
      if (value) current.rules.push({ allow: key === "allow", pattern: value });
    } else if (key === "crawl-delay" && Number.isFinite(Number(value))) {
      current.crawlDelaySeconds = Math.max(current.crawlDelaySeconds ?? 0, Number(value));
    } else if (key === "request-rate") {
      // "1/60": one request every 60 s ("1/10m": every 10 minutes).
      const rate = /^(\d+)\s*\/\s*(\d+)\s*([smh])?/i.exec(value);
      if (rate && Number(rate[1]) > 0) {
        const unit = { s: 1, m: 60, h: 3600 }[(rate[3] ?? "s").toLowerCase() as "s" | "m" | "h"];
        const seconds = (Number(rate[2]) * unit) / Number(rate[1]);
        current.crawlDelaySeconds = Math.max(current.crawlDelaySeconds ?? 0, seconds);
      }
    }
  }

  const token = userAgent.split("/")[0]!.toLowerCase();
  const ours = groups.filter((group) => group.agents.some((agent) => agent === token));
  const chosen = ours.length ? ours : groups.filter((group) => group.agents.includes("*"));
  const rules = chosen.flatMap((group) => group.rules);
  const crawlDelaySeconds = chosen.find((group) => group.crawlDelaySeconds)?.crawlDelaySeconds;

  return {
    allows(path) {
      let best: { allow: boolean; length: number } | undefined;
      for (const rule of rules) {
        if (!matches(rule.pattern, path)) continue;
        const length = rule.pattern.length;
        if (!best || length > best.length || (length === best.length && rule.allow)) {
          best = { allow: rule.allow, length };
        }
      }
      return best?.allow ?? true;
    },
    ...(crawlDelaySeconds !== undefined && { crawlDelaySeconds }),
  };
}
