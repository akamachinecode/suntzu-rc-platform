# Operations

How to run, change and recover this project. Secrets appear here by name only, never their values. Write "Unknown — ask <who>" rather than leaving a gap unexplained.

## Run locally

See the Quick start in [`README.md`](../README.md). SunTzu RC also has:

- `pnpm db:seed` — loads the hand-checked events, places, hosts and sources into the local database.
- `pnpm engine [source…]` — runs the events engine once against the real websites (polite: robots.txt, 2 s between requests to the same site). Raw responses go to `ENGINE_SNAPSHOT_DIR` (`.snapshots/`, git-ignored).
- `pnpm census [dataset…]` — loads the public registers for Florida: FAA recognised areas (`fria`) and recreational fixed sites (`fixed-sites`) into places and clubs, then `airports`, controlled `airspace` and `zip-codes`. About eight requests, one at a time; safe to run again (nothing is added twice). Run `pnpm db:seed` first so the hand-checked places are matched, not duplicated. See [`bits/census.import.md`](./bits/census.import.md).

- `pnpm notify [digest] [report]` — sends change alerts (and, on Thursdays or when named, the weekly digest; on the 1st, organisers' reports) and deletes messages older than 12 months. Locally emails are printed, not sent (`MAIL_TRANSPORT=log`).

## Deploy and roll back

- **Deploy:** merging to `main` deploys production; `staging` from **Actions → Deploy**. Details in [`DEPLOY.md`](./DEPLOY.md). Nothing is deployed yet: going live is the owner's checklist in [`LAUNCH.md`](./LAUNCH.md).
- **Run a job by hand** (`setup`, `engine`, `notify`, `census`): **Actions → Run a task**. Their schedules are in `infra/jobs.tf`.
- **Roll back:** revert the change on `main` (`git revert <commit>` in a pull request) and let the normal deploy run. Never change production by hand.
- **Docs portal** (https://akamachinecode.github.io/suntzu-rc-platform/): published by `.github/workflows/docs.yml` whenever a document changes on `main` (bit `docs.publish`). To publish again by hand: **Actions → Docs portal → Run workflow**. A failed build leaves the previous version online. Rolling back works the same way: revert on `main`.

## Access

| What              | Who has access                                         | How                                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub repository | Unknown — ask the owner                                | Organization team                                                                                                                                                                                                                           |
| AWS account       | The owner (project `suntzu-rc`)                        | `aws login --profile suntzu-rc-admin` (see `DECISIONS.md`, 2026-11-10)                                                                                                                                                                      |
| Cloudflare zone   | The owner (`suntzurc.com`, registered with Cloudflare) | Account member, Itaca SSO. The zone is in the **ITACA TECHNOLOGIES** account                                                                                                                                                                |
| Cloudflare token  | GitHub environments `production` and `staging`         | Secret `CLOUDFLARE_API_TOKEN`, account token `suntzu-dns`: DNS Edit and Zone Read on `suntzurc.com` only. **Expires 2027-11-10**: create a new one before then and replace the secret in both environments, or deploys fail at the DNS step |

## Configuration and secrets

Variable names are listed in the `.env.example` files. Real values live in AWS Systems Manager Parameter Store for production (`/rc-landing/<stage>/…`, see "Secrets and configuration" in [`DEPLOY.md`](./DEPLOY.md)), and in the team password manager.

## Backups and recovery

| Data                       | Backed up by                                 | Kept for             | Last tested restore |
| -------------------------- | -------------------------------------------- | -------------------- | ------------------- |
| PostgreSQL (events, users) | Amazon RDS automated backups (once deployed) | RDS default (7 days) | never               |
| Engine snapshots           | Local disk now; Amazon S3 once deployed      | until re-fetched     | —                   |

## Keeping dependencies current

SunTzu RC's own rule (see `DECISIONS.md`, 2026-10-22): always the latest stable release, once it is at least one day old. Security fixes first: a high or critical advisory gets fixed the day it appears. `pnpm audit` should report nothing; known exceptions are listed with a reason in `pnpm-workspace.yaml`.

## Monitoring

Everything below is set up by `infra/` and stays in this AWS account (`us-east-2`). Nothing needs to be configured by hand except who receives the alarms.

### What is watched

| Signal     | What it answers                             | Where                                                                                                                                             |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alarms** | Do I need to act now?                       | CloudWatch → Alarms, names start with `rc-landing-<stage>-`                                                                                       |
| **Logs**   | What exactly happened?                      | CloudWatch Logs, groups `/ecs/rc-landing-<stage>/app`, `/api` and one per scheduled job (`/engine`, `/notify`, `/census`, `/setup`), kept 30 days |
| **Traces** | Which step of a request failed or was slow? | CloudWatch → Application Signals → Transaction Search (stored in the log group `aws/spans`)                                                       |
| **Uptime** | Does the site answer from the internet?     | Route 53 → Health checks (`app` and `api`, every 30 seconds from three regions, through Cloudflare)                                               |

Logs are JSON lines. Every line written while handling a request carries its `trace_id`, and every API response returns it in the `x-request-id` header. When someone reports an error, ask for that value (browser → Network tab → the request → Response headers), then:

- **Its logs:** CloudWatch → Logs Insights, select both log groups, run:

  ```text
  fields @timestamp, level, message
  | filter trace_id = "<id>" or message.traceId = "<id>"
  | sort @timestamp asc
  ```

- **Its trace:** CloudWatch → Transaction Search → filter by trace ID. The trace shows the page in `apps/app`, its calls to `apps/api` and every database query, each with its duration.

### Who gets the alarms

Set in `alerts` in `infra/<stage>.tfvars.json`, then deploy. A stage with nobody to alert refuses to deploy.

```json
"alerts": {
  "emails": ["alerts@example.com"],
  "slack": { "team_id": "T0123ABCD", "channel_id": "C0123ABCD" },
  "monthly_budget": 150
}
```

- **Email:** AWS sends each address one "Subscription confirmation" email per topic. Alerts only arrive after clicking **Confirm subscription** in each.
- **Slack:** once per workspace, open the AWS console → **Amazon Q Developer in chat applications** → **Configure new client** → Slack, and authorize the workspace. The workspace ID is shown there; the channel ID is in Slack (channel → **View channel details**, at the bottom). Invite `@Amazon Q` to the channel.
- **Microsoft Teams:** same console, **Configure new client** → Microsoft Teams, then use `"teams": { "tenant_id": "…", "team_id": "…", "channel_id": "…" }`. Private channels are not supported.
- **Critical** alarms mean users are affected now. **Warning** alarms mean they will be if nobody looks today. Both say when they recover (`OK`).
- `monthly_budget` (USD, production only) warns when the AWS bill of the month is forecast to exceed it.
- `uptime: false` turns off the uptime checks (about 2.75 USD a month each), for stages nobody visits.

**Rehearse** after the first deploy and whenever the recipients change: the alarm fires, everyone should receive it, and it returns to `OK` on its own within minutes.

```bash
aws cloudwatch set-alarm-state --alarm-name rc-landing-production-api-5xx --state-value ALARM --state-reason "Rehearsal"
```

### Traces

`apps/app` and `apps/api` record traces with OpenTelemetry (`apps/app/src/instrumentation.ts`, `apps/api/src/otel.ts`) and send them to an OpenTelemetry Collector that runs next to each one. The Collector removes query strings, IP addresses, email addresses and tokens, then sends the traces to CloudWatch, signed with the service's role (no keys).

- **Every request is traced**, except health checks. When traffic grows, keep a share instead: `"trace_sample_ratio": 0.1` in `alerts` keeps 10% of new traces (a request from the app always follows the app's decision into the API). Errors stay in the logs either way.
- **Locally** tracing is off (`OTEL_SDK_DISABLED=true` in `.env`).
- **Once per AWS account:** `infra/bootstrap` turns on Transaction Search (`traces.tf`). Then set how long spans are kept: `aws logs put-retention-policy --log-group-name aws/spans --retention-in-days 30`.
- **A copy for another tool** (Grafana Cloud, Honeycomb, any OTLP/HTTP backend) is a decision for Itaca engineering, written in `docs/DECISIONS.md`, because the data leaves this account. It is set per service with `telemetry.remote` in `infra/main.tf`.

### Runbooks

Every alarm links here. First steps for each; if they don't explain it, open the logs and traces of the time it started.

#### Site down

The app or the API didn't answer from the internet for 1–2 minutes. Users can't use it.

1. Open the URL in the alarm yourself. If it works, check Cloudflare: **Bot Fight Mode** (Security → Bots) blocks Route 53's checkers and makes this alarm fire while the site works. Turn it off, or on Pro and above add a WAF custom rule that skips bot protection for Route 53's IP ranges.
2. Cloudflare error page (52x): the origin is down. See [No healthy task](#no-healthy-task).
3. DNS or certificate error: check the zone in Cloudflare and the last change to `infra/`.

#### Errors 5xx

More than 5% of a service's responses were server errors for 5 minutes.

1. Logs Insights on the service's log group, `filter level = "error"`, from the time the alarm started.
2. Take a `trace_id` from those lines and open its trace: the failed step is marked as an error.
3. If it started with a deploy, revert that change on `main`.

#### No healthy task

No container of the service passes its health check (`/api/health` for the app, `/health` for the API, which also checks the database). ECS keeps restarting it.

1. ECS → cluster → service → **Events** and **Tasks → Stopped**: the reason it stopped.
2. Its last log lines. "Database" in them: see [Database event](#database-event).
3. If it started with a deploy, the deploy rolls back by itself; revert the change on `main`.

#### Slow responses

The slowest 5% of requests took more than 2 seconds for 15 minutes.

1. Transaction Search: the slowest traces of the period. The longest bar is the culprit, usually a database query (missing index, too many rows) or a call to another service.
2. Check [Database CPU](#database-cpu) and [CPU high](#cpu-high) at the same time.

#### CPU high

A service used more than 85% of its CPU for 15 minutes. It may slow down.

1. A traffic spike (load balancer → Monitoring → Requests) or a slow loop in the code (traces).
2. If the traffic is real, raise `cpu` of the service in `infra/main.tf` (ask Itaca engineering).

#### Memory high

A service used more than 85% of its memory for 15 minutes. At 100% the container is restarted.

1. Rising steadily since the last deploy: a memory leak; revert or fix.
2. Real growth: raise `memory` of the service in `infra/main.tf` (ask Itaca engineering).

#### Error logs

A service logged 10 or more errors in 5 minutes, even if users mostly got answers.

1. Logs Insights, `filter level = "error"`: group them by `message` to see if it's one problem or several.
2. Follow a `trace_id` to its trace.

#### Load balancer 5xx

The load balancer itself answered 502, 503 or 504: no healthy container, a container that crashed mid-request, or a request that took longer than 60 seconds.

1. Check [No healthy task](#no-healthy-task) first.
2. 504s: a request that never finishes; find it in the traces.

#### Deployment failed

A new version never passed its health check and ECS rolled back to the previous one. Users keep the previous version.

1. The Deploy run in GitHub Actions links to the logs; the reason is in the new container's last lines.
2. Fix it in a new pull request. Nothing to roll back.

#### Job failed

A scheduled job (`engine`, `notify`, `census` or `setup`, see `infra/jobs.tf`) stopped with an error, or its task never started. It runs again at its next time; what it should have done in this run (read sources, send alerts) didn't happen.

1. CloudWatch Logs, group `/ecs/rc-landing-<stage>/<job>`, the stream of that run: its last lines say why.
2. "Never started" (`TaskFailedToStart`): ECS → cluster → **Tasks → Stopped** shows the reason (image, secrets, capacity).
3. To run it again now: **Actions → Run a task → Run workflow** in GitHub, or wait for the next schedule.

#### Database storage

Less than 2 GB of free disk. It grows on its own up to 100 GB, but if it fills, the database stops accepting writes.

1. Find what grew (a table, logs written to the database). Ask Itaca engineering before deleting data.

#### Database CPU

The database used more than 80% of its CPU for 15 minutes.

1. Transaction Search: the slowest queries (`pg.query` spans). Usually a missing index.

#### Database CPU credits

The database instance (`db.t4g.micro`) runs out of CPU credits under sustained load; at 0 it slows down to a fraction of its speed.

1. Same causes as [Database CPU](#database-cpu). If the load is real, ask Itaca engineering to move to a larger instance.

#### Database memory

Less than 64 MB of free memory on the database for 15 minutes.

1. Too many connections or heavy queries; check [Database connections](#database-connections) and the slow traces.

#### Database connections

More than 60 open connections for 15 minutes; the instance accepts around 80.

1. Each API container opens up to 10. More containers or scheduled jobs add up; a leak shows as a steady climb.

#### Database event

RDS reported a failover, a failure, a maintenance or low storage. Maintenance and minor version upgrades restart the database for a minute or two; the API reconnects by itself.

1. Read the event in the email or channel; RDS → Databases → **Logs & events** has the detail.

#### Budget exceeded

The AWS bill of the month reached, or is forecast to reach, `monthly_budget`.

1. AWS console → Billing → **Cost Explorer**, grouped by service. Common causes: a stage nobody uses, logs or traces growing with traffic (`trace_sample_ratio`), data transfer.

## Performance

Measure first, change one thing, measure again with the same method. The numbers of each fix are in `DECISIONS.md` (2026-11-10, "Home performance").

### How to measure

- **Server, in AWS:** CloudWatch → Logs Insights, log group `aws/spans`, the slowest pages of the last day. `GET /` is the home page; `RSC GET` is the same page reached by clicking a link.

  ```text
  filter name like /^GET / and resource.attributes.service.name = "app"
  | stats count(*) as n, pct(durationNano, 50) / 1000000 as p50_ms,
          pct(durationNano, 95) / 1000000 as p95_ms by attributes.http.route
  | sort p95_ms desc
  ```

- **Server, locally:** a production build limited to half a CPU, like the app's Fargate task (`cpu = 512` in `infra/main.tf`). Absolute times are lower than in AWS (a laptop core is faster); compare before and after on the same machine.

  ```bash
  pnpm --filter @workspace/app build
  ```

  ```bash
  cd apps/app && systemd-run --user --scope -p CPUQuota=50% pnpm start
  ```

  Then, 30 requests after 3 to warm up, the median and the 95th percentile of the full response, and the page's weight:

  ```bash
  for i in $(seq 33); do curl -s -o /dev/null -w "%{time_total}\n" http://localhost:3000/; done | tail -30 | sort -n | awk '{a[NR]=$1} END {print "p50", a[15]*1000, "ms  p95", a[29]*1000, "ms"}'
  ```

  ```bash
  curl -s http://localhost:3000/ | wc -c; curl -s -H 'Accept-Encoding: gzip' http://localhost:3000/ | wc -c
  ```

- **Browser:** Chrome DevTools → Performance, with CPU throttling at 4× for a mid-range phone. Look at LCP (when the largest thing on screen is painted), long tasks while scrolling (red corners on the frames), and the HTML's size in the Network tab. Test on a real phone too: a desktop GPU hides the cost of WebGL.

### What we learned

- **A drawing written as JSX in a Server Component is sent twice:** once as HTML and once more in the React payload that follows it (`self.__next_f.push`), even when nothing on it runs in the browser. The three guide covers on the home page were 669 KB of SVG and turned the page into 1.6 MB. Drawings that never change go in files (`src/components/home/covers/`), shown with `next/image` from a static import: Next.js gives them a hashed URL under `/_next/static/media/` with a one-year `immutable` cache.
- **The figure kit's line weights need the `iso-svg` class** on the `<svg>` that holds the drawing: its lines keep the same thickness at any size (`vector-effect: non-scaling-stroke`) only inside it. Without it the lines of a scaled-down image come out thinner. A cover file is also drawn at the width it is shown at, so the two match.
- **No `--` inside an XML comment.** A browser refuses the whole SVG file as an image (it shows as broken), while the same markup inline in HTML works. `covers.test.tsx` checks it.
- **Smoothed scrolling is felt as lag.** A scroll library that eases the page towards the wheel's target (Lenis with `lerp: 0.1`) took 382 ms to cover 90% of a wheel step, against one frame for the browser's own scrolling. Measure it by logging `scrollY` on every frame after a wheel event; the browser automation tools here scroll without wheel events, so they can't measure the native case. Smooth in-page links need only CSS (`scroll-behavior: smooth`).
- **Find where a WebGL scene spends its time before changing it.** Time the `requestAnimationFrame` callbacks (the JavaScript) separately from the frame rate. Here the JavaScript took under 1 ms per frame and the graphics chip took the rest, so the fix was fewer pixels on slow devices (`scenes/quality.ts`), not less code. A browser without a GPU (software WebGL, as in these automation tools) exaggerates the chip's cost: it is useful to compare before and after, but not as an absolute number.
- **Scroll-linked motion belongs on the compositor.** A transform moved by JavaScript on scroll events stutters on a phone whenever the page is busy, because the browser scrolls on another thread. Motion (14.9) hands it to the browser as a scroll-driven animation when three things hold:
  - the `useScroll` offsets are at the screen's edges (`"start end"`, `"start start"`, `"end end"`; not `"start 0.35"`);
  - `useTransform` maps them with arrays rather than a function;
  - the value is bound as `transform` or `opacity` on an HTML element (not `rotate`, not an SVG element).

  Check with `document.getAnimations()`: those animations have a `ViewTimeline`.

- **Find the slow step before splitting work.** Wrap each step in `performance.mark` and `performance.measure` in a production build, then read the entries in the browser. A diorama's time was in building its geometry, not in compiling shaders.
- **Scrolling in headless Chromium:** `Input.synthesizeScrollGesture` with `gestureSourceType: "touch"` doesn't scroll a page emulating a phone. `"mouse"` does, through the same compositor, so use it for flicks.
- **`react-dom/server` can't run inside Next.js's server code** (pages and route handlers throw "react-dom/server is not supported in React Server Components"). Files drawn from React components are written by a Vitest test instead (`pnpm --filter @workspace/app covers`), which also fails when a figure changes and its file wasn't redrawn.

## Known risks

- The engine reads other people's websites. It must stay polite (robots.txt, rate limits, conditional requests) and must never store personal data from calendars or pages (see `DECISIONS.md`, 2026-10-22).
- OpenFreeMap has no SLA; Itaca may want Amazon Location Service before production.
