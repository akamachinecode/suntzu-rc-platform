// Verification hooks for AI agents (see "Definition of done" in AGENTS.md). No dependencies; Node runs
// the TypeScript directly. State lives in .claude/state/ (git-ignored, per computer).
//
//   node .claude/hooks/verification.ts stop             Stop hook: fast checks when the agent finishes a turn
//   node .claude/hooks/verification.ts record <level>    /verify: records what was verified (verify | check)
//   node .claude/hooks/verification.ts status           Shows whether the current files are verified
//   node .claude/hooks/verification.ts gate             PreToolUse hook (Bash): the commit gate
//
// The commit gate stops `git commit` when the files being committed aren't the ones /verify recorded, and
// asks for a `Verified-by:` trailer saying how they were verified (`git log` then shows it for every
// commit). Mode in .claude/verification.json: "enforce" (default), "observe" (only logs what it would
// have stopped, in .claude/state/gate.log) or "off".
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const stateDir = path.join(projectDir, ".claude", "state");
/** Rounds of failing checks before the agent must stop and explain (AGENTS.md, "When a check fails"). */
const MAX_ROUNDS = 3;
/** Commits the gate stops in one session before it lets the next one through, so an agent never gets stuck. */
const MAX_BLOCKS = 2;

export type Level = "verify" | "check";
export type Verified = { tree: string; level: Level; at: string };

export function git(args: string[], env: Record<string, string> = {}): string {
  return execFileSync("git", args, {
    cwd: projectDir,
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/** Git tree of the files as they are now (what `git add -A` would stage), without touching the index. */
export function workingTree(): string {
  const index = path.resolve(projectDir, git(["rev-parse", "--git-path", "index"]));
  const scratch = path.join(tmpdir(), `itaca-index-${process.pid}-${Date.now()}`);
  if (existsSync(index)) {
    copyFileSync(index, scratch);
    // Keep the index's own timestamp: git compares it with each file's to spot files changed in the same
    // second ("racy git"). With a newer copy, an edit of the same size right after /verify would be missed.
    const { atime, mtime } = statSync(index);
    utimesSync(scratch, atime, mtime);
  }
  try {
    git(["add", "--all"], { GIT_INDEX_FILE: scratch });
    return git(["write-tree"], { GIT_INDEX_FILE: scratch });
  } finally {
    rmSync(scratch, { force: true });
  }
}

export function readState<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path.join(stateDir, `${name}.json`), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeState(name: string, value: unknown): void {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(path.join(stateDir, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
}

function readInput(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(0, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function pnpm(script: string): { ok: boolean; output: string } {
  // A shell only on Windows, where pnpm is a .cmd file Node can't start without one. The arguments are
  // this file's own constants, never input.
  // nosemgrep: javascript.lang.security.audit.spawn-shell-true.spawn-shell-true
  const result = spawnSync("pnpm", ["--silent", script], { cwd: projectDir, encoding: "utf8", shell: process.platform === "win32" });
  return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

/**
 * Stop hook. When the files changed since the last passing run, runs the fast checks (`pnpm check:fast`,
 * or only the format and bits checks for documentation-only changes). If they fail, the agent is sent
 * back to fix them (exit 2); after MAX_ROUNDS failing rounds it is told to stop and explain instead.
 */
function stop(): void {
  const input = readInput();
  const session = String(input.session_id ?? "default");
  if (!existsSync(path.join(projectDir, "node_modules"))) return;
  let tree: string;
  try {
    tree = workingTree();
  } catch {
    return; // not a git repository yet
  }
  const state = readState<{ passed?: string; rounds?: Record<string, number>; explained?: string }>("stop", {});
  if (tree === state.passed || tree === state.explained) return;

  const changedSince = (base: string) => git(["diff", "--name-only", base, tree]).split("\n").filter(Boolean);
  let changed: string[];
  try {
    changed = changedSince(state.passed ?? "HEAD");
  } catch {
    changed = changedSince("HEAD"); // the last passing tree was garbage-collected, or there's no commit
  }
  if (!changed.length) return;
  const docsOnly = changed.every((file) => file.endsWith(".md"));
  const results = docsOnly ? [pnpm("format:check"), pnpm("check:bits")] : [pnpm("check:fast")];
  const failed = results.filter((result) => !result.ok);

  const rounds = state.rounds ?? {};
  if (!failed.length) {
    writeState("stop", { passed: tree });
    return;
  }
  rounds[session] = (rounds[session] ?? 0) + 1;
  const output = failed
    .map((result) => result.output.trim().split("\n").slice(-40).join("\n"))
    .join("\n");
  if (rounds[session] >= MAX_ROUNDS) {
    writeState("stop", { ...state, rounds: { ...rounds, [session]: 0 }, explained: tree });
    process.stderr.write(
      `The fast checks still fail after ${MAX_ROUNDS} rounds. Stop trying fixes now. Tell the person, in plain words and in their language, what doesn't work, what you tried and what you think the cause is, and suggest involving Itaca engineering. Last output:\n${output}\n`,
    );
    process.exit(2);
  }
  writeState("stop", { ...state, rounds });
  process.stderr.write(
    `${docsOnly ? "pnpm format:check / check:bits" : "pnpm check:fast"} failed (round ${rounds[session]} of ${MAX_ROUNDS}). Fix the cause in the code, not the check: no .skip, no disabled rules, no lowered limits. Run \`pnpm format\` for formatting.\n${output}\n`,
  );
  process.exit(2);
}

/** Records that the current files were verified (called by the /verify skill after its checks pass). */
function record(level: string): void {
  if (level !== "verify" && level !== "check") {
    console.error("Usage: node .claude/hooks/verification.ts record <verify|check>");
    process.exit(1);
  }
  const verified: Verified = { tree: workingTree(), level, at: new Date().toISOString() };
  writeState("verified", verified);
  console.log(
    `Recorded "${level}" for the files as they are now (${verified.tree.slice(0, 7)}). Changing any file makes it stale: verify again before committing.`,
  );
}

/** Blob of each path in a tree ("" when the path isn't there). */
function blobs(tree: string, paths: string[]): Map<string, string> {
  const found = new Map(paths.map((file) => [file, ""]));
  if (!paths.length) return found;
  for (const line of git(["ls-tree", "-r", "-z", tree, "--", ...paths]).split("\0").filter(Boolean)) {
    const [meta, file] = line.split("\t");
    found.set(file, meta.split(" ")[2]);
  }
  return found;
}

/**
 * Whether what is about to be committed is exactly what was verified: every file that differs from the
 * last commit (in the working tree or staged) has the same content as when /verify recorded it.
 */
export function verifiedLevel(): Level | null {
  const verified = readState<Verified | null>("verified", null);
  if (!verified) return null;
  const current = workingTree();
  const changed = (args: string[]) => git(["diff", "--name-only", "-z", ...args]).split("\0").filter(Boolean);
  const staged = changed(["--cached", "HEAD"]);
  const paths = [...new Set([...changed(["HEAD", current]), ...staged])];
  if (!paths.length) return verified.level;
  const want = blobs(verified.tree, paths);
  const now = blobs(current, paths);
  const index = blobs(git(["write-tree"]), staged);
  const same = paths.every((file) => now.get(file) === want.get(file) && (!index.has(file) || index.get(file) === want.get(file)));
  return same ? verified.level : null;
}

type GateState = { blocks?: Record<string, number> };

/**
 * `git commit` as the subcommand, also after git's own options (`git -C dir commit`, `git -c k=v commit`).
 * Not `git log --grep commit`, `git show HEAD -- commit.ts` or `git commit-tree`.
 */
export const GIT_COMMIT = /(?:^|[\s;&|(])git(?:\s+(?:-[Cc]\s+\S+|--?[\w-]+(?:=\S+)?))*\s+commit(?=\s|$)/;

/** PreToolUse hook on Bash: stops unverified commits (see the header of this file). */
function gate(): void {
  const input = readInput();
  const command = String((input.tool_input as { command?: unknown } | undefined)?.command ?? "");
  if (!GIT_COMMIT.test(command)) return;
  let mode = "enforce";
  try {
    mode = (JSON.parse(readFileSync(path.join(projectDir, ".claude", "verification.json"), "utf8")) as { gate?: string }).gate ?? mode;
  } catch {
    // no settings file: enforce
  }
  if (mode === "off") return;

  let level: Level | null;
  try {
    level = verifiedLevel();
  } catch {
    return; // not a git repository, or no commit yet
  }
  const claimed = command.match(/Verified-by:\s*(verify|check|none)/)?.[1];
  const reason = /Unverified:\s*\S/.test(command);
  let problem = "";
  if (level && !claimed) {
    problem = `Add how these files were verified to the commit: --trailer "Verified-by: ${level}".`;
  } else if (level && claimed === "verify" && level === "check") {
    problem = `These files were only checked (pnpm check), not verified with /verify: use --trailer "Verified-by: check", or run /verify.`;
  } else if (!level && claimed !== "none") {
    problem = `These files aren't verified: they changed after /verify recorded them, or /verify never ran. Run /verify (it ends with \`node .claude/hooks/verification.ts record verify\`) and commit again. If they truly can't be verified, say why: --trailer "Verified-by: none" and a line "Unverified: <reason>" in the commit message.`;
  } else if (claimed === "none" && !reason) {
    problem = `A commit marked "Verified-by: none" needs the reason in its message: a line "Unverified: <reason>".`;
  }
  if (!problem) return;

  if (mode === "observe") {
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(path.join(stateDir, "gate.log"), `${new Date().toISOString()} would stop: ${problem}\n`, { flag: "a" });
    return;
  }
  const session = String(input.session_id ?? "default");
  const state = readState<GateState>("gate", {});
  const blocks = state.blocks ?? {};
  if ((blocks[session] ?? 0) >= MAX_BLOCKS) {
    writeState("gate", { blocks: { ...blocks, [session]: 0 } });
    console.log(JSON.stringify({ systemMessage: `Commit gate: let this commit through after ${MAX_BLOCKS} stops in this session (${problem})` }));
    return;
  }
  writeState("gate", { blocks: { ...blocks, [session]: (blocks[session] ?? 0) + 1 } });
  process.stderr.write(`Commit gate (AGENTS.md, "Definition of done"): ${problem}\n`);
  process.exit(2);
}

function status(): void {
  const verified = readState<Verified | null>("verified", null);
  if (!verified) return console.log("Nothing verified yet: run /verify.");
  const current = verified.tree === workingTree();
  console.log(`${current ? "Verified" : "Stale"}: "${verified.level}" at ${verified.at}${current ? "" : " (files changed since)"}.`);
}

if (import.meta.main) {
  const [command, arg] = process.argv.slice(2);
  if (command === "stop") stop();
  else if (command === "record") record(arg);
  else if (command === "status") status();
  else if (command === "gate") gate();
  else {
    console.error("Usage: node .claude/hooks/verification.ts <stop|record <verify|check>|status|gate>");
    process.exit(1);
  }
}
