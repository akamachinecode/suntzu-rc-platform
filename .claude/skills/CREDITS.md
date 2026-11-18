# Skills: credits

The skills in this folder are Itaca Technologies' adaptations, written for the Itaca standard and kept in the repository so every project gets the same version. They are based on these open-source skills, which are worth reading:

| Skill        | Based on                                                                                                                                                | License    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `plan`       | Anthropic, [`write-spec`](https://github.com/anthropics/knowledge-work-plugins/tree/main/product-management/skills/write-spec) · Matt Pocock, [`grilling`, `to-spec`, `to-tickets`](https://github.com/mattpocock/skills) | Apache-2.0 · MIT |
| `fix`        | Matt Pocock, [`diagnosing-bugs`](https://github.com/mattpocock/skills)                                                                                  | MIT        |
| `ship`       | Theo Browne, [`full-stop`, `file-pr`, `babysit-pr`](https://github.com/t3dotgg/tstack)                                                                  | MIT        |
| `takeover`   | Theo Browne, [`takeover`, `modernize`](https://github.com/t3dotgg/tstack)                                                                               | MIT        |
| `verify`     | The Claude Code team, [how they think about verification](https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification/) (a skill that runs the change, checks triggered by the diff, three rounds then a person, a change can't edit its own checks) | —          |
| `security`   | majejorex, [secdev `security-checklist` and `security-fix`](https://github.com/majejorex/secdev-suite) (controls with `file:line` evidence, refute pass, derived verdict), on OWASP ASVS 5.0 and API Security Top 10 2023. For full audits Itaca engineering uses Cloudflare's [`security-audit`](https://github.com/cloudflare/security-audit-skill), not shipped here | MIT        |
| `guide`, `document` | Itaca Technologies                                                                                                                               | —          |

Skills use the open [Agent Skills](https://agentskills.io/) format. Claude Code loads them automatically; other tools can read the `SKILL.md` files directly (see `AGENTS.md`).
