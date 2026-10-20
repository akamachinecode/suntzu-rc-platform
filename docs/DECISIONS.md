# Decisions log

Every non-trivial decision goes here, newest first: new dependencies, environment variables, external services, data model changes, deviations from the Itaca standard. Itaca engineering reads this file when taking over the project.

Format:

```md
## YYYY-MM-DD — Short title

- **What:** what was decided or added.
- **Why:** the business or technical reason.
- **Impact:** new env vars, services, costs, risks, follow-ups for engineering.
```

## 2026-10-20 — Project created

- **What:** scaffolded with `create-itaca@0.1.0`: stack `web-app`, deployed to AWS via `sst`, Cloudflare in front.
- **Why:** Itaca Technologies standard stack.
- **Impact:** none.
