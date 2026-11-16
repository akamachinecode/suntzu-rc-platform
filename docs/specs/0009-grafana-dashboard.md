# 0009 — One operations dashboard in Grafana Cloud

- **Status:** Approved 2026-11-17
- **Requested by:** the owner (Alejandro), 2026-11-16
- **Approved by:** the owner, 2026-11-17

## Problem

Everything SunTzu RC measures (20 alarms, 8 log groups, request traces and about 90 metrics from the load balancer, the containers, the database, the scheduler and Route 53) lives in CloudWatch, spread over a dozen console screens in two Regions. Reading it takes knowing where each piece is and how to query it, which the owner is still learning. The project is also a demo: the crew wants to show and understand the whole infrastructure from one place.

## Goals

- The owner and one other person open one Grafana folder and see, in order of importance, whether SunTzu RC is healthy and why not.
- Every signal the account already produces is visible: alarms and uptime, traffic, errors and latency, containers, database, scheduled jobs, logs and traces.
- The data never leaves AWS: Grafana reads CloudWatch when a dashboard is open and stores nothing.
- Grafana uses a read-only role with no keys; it can't change or delete anything.
- Adding production later is choosing it in a selector, not building a second dashboard.
- The dashboards live in the repository, so they're reviewed like code and can be rebuilt.

## Out of scope

- **Alerting from Grafana.** Alarms stay in CloudWatch → SNS → email (`docs/OPERATIONS.md`). One place sends alerts.
- **Copying data to Grafana Cloud** (the Collector's `telemetry.remote`, Grafana's own log or trace storage): it would move data out of the account and isn't needed to see it.
- **Cloudflare analytics, the AWS bill and GitHub Actions.** Possible later, each with its own access.
- **Public or shared links.** Only invited users see the dashboards.

## User stories

- As the owner, I open one page and know in ten seconds whether staging is healthy.
- As the owner, when an alarm email arrives, I open the dashboard, see the same metric with the same threshold, and follow it to the error logs and the slow traces.
- As someone learning AWS, I see every part of the infrastructure (load balancer, containers, database, scheduler, uptime checks) with a one-line explanation of what each chart means.
- As the owner, I widen the log and trace panels from the last 24 hours to any period up to 30 days when I'm investigating.
- As the crew, when production exists, we pick it in the "Environment" selector.

## Capabilities touched

- **Business systems / integrations:** Grafana Cloud, an external service, reads the AWS account through an IAM role it assumes (Grafana's account and the stack's external ID, no keys). On the "When to stop" list (integration, IAM): see below.
- **Data:** no new tables. Grafana reads metrics, alarm history, logs and traces. Logs and traces hold routes, timings and SQL text with placeholders, no personal data (the Collector removes IPs, emails and tokens, `docs/OPERATIONS.md#traces`). The role can only read the project's log groups (`/ecs/rc-landing-*`, `aws/spans`, `/aws/application-signals/data`).
- **Identity:** two Grafana users (the owner and one more), on Grafana Cloud's free plan (up to 3). No public dashboards.
- **Operations:** cost. CloudWatch charges Grafana's queries: about 0.01 USD per 1,000 metrics read and 0.005 USD per GB of logs scanned. With refresh every 5 minutes only while a dashboard is open, and today's volumes (under 5 MB of logs and traces), the estimate is 1–2 USD a month. Grafana Cloud free: 0 USD.

## Bits

- None. The dashboards are operations tooling outside `apps/`; no visitor or crew action in the product changes.

## Acceptance criteria

- When Grafana's CloudWatch data source is tested, then it connects with the role and reads us-east-2 and us-east-1.
- When anyone tries to assume the role without the stack's external ID, then AWS refuses.
- When the role tries to change anything (put a metric, delete a log group, change an alarm), then AWS refuses.
- When the owner opens the "Overview" dashboard, then every one of the 20 alarms shows its metric coloured with the alarm's own threshold, and alarm state changes appear as annotations.
- When an alarm fires in CloudWatch, then the same panel in Grafana turns red within one refresh.
- When the time range is the default, then log and trace panels show the last 24 hours, and can be widened up to 30 days.
- When a trace ID (`x-request-id`) is pasted in the Traces dashboard, then all its spans appear in order with their durations.
- When the "Environment" selector changes, then every panel shows that stage (staging today).
- When the dashboards are changed, then the JSON in `infra/grafana/` is updated in the same pull request.
- When a month has passed, then CloudWatch's cost for Grafana's queries is under 5 USD.

## Slices

- [x] 1. **Read-only role:** `infra/bootstrap/grafana.tf` with the role Grafana assumes (trust: Grafana's account + external ID; permissions: read CloudWatch metrics and alarms, query the project's logs, read X-Ray traces, list Regions and tags). Applied by the agent with the admin profile after the owner sees the plan. `docs/DECISIONS.md`, `docs/OPERATIONS.md` and `docs/TERRAFORM.md` updated. Role `rc-landing-grafana-read-only`, applied 2026-11-17. (blocked by: —)
- [x] 2. **Grafana connected:** CloudWatch data source (us-east-2 by default, us-east-1 for uptime), set up through Grafana's API with a service account token; the "SunTzu RC" folder, visible only to the stack's invited users. Needed an exception in the organization's resource control policy (`DECISIONS.md`, 2026-11-17). The Application Signals (X-Ray) data source is left out (see open questions). (blocked by: —)
- [x] 3. **Overview, Traffic and Database:** the metric dashboards (contents below), saved in `infra/grafana/`. (blocked by: 2)
- [x] 4. **Logs and Traces:** the Logs Insights dashboards over the log groups and `aws/spans`, with a trace ID search. (blocked by: 2)
- [x] 5. **Platform and the guide:** the scheduler, container image pulls, CloudWatch ingestion and the cost of Grafana's own queries; a "Grafana" section in `docs/OPERATIONS.md` (how to open it, what each dashboard answers, how to update the JSON). (blocked by: 3, 4)

### What each dashboard shows, in order

1. **Overview — "is it healthy?"** Uptime of the site and the API from Route 53 (us-east-1); the 20 alarms as coloured tiles with their thresholds (critical first); requests per minute, server errors and p95 latency of the site and the API; alarm state changes as annotations.
2. **Traffic — the load balancer and the containers.** Requests by response class (2xx, 3xx, 4xx, 5xx), latency p50/p95/p99 by service, active and new connections, capacity units (LCU, what the load balancer costs), healthy and unhealthy targets; CPU, memory and running tasks of each service; Application Signals' latency, errors and faults per service.
3. **Database — PostgreSQL on RDS.** CPU and CPU credits (a `t4g.micro` works in bursts), connections, free memory and swap, free storage, read and write latency, IOPS and throughput, disk queue, network, transaction logs.
4. **Logs — "what happened?"** Errors over time and grouped by message; requests per bit and status; the latest lines of each service and job (app, api, engine, notify, census, setup); last run and result of each scheduled job.
5. **Traces — "where did the time go?"** Slowest pages and API routes (p50/p95), slowest SQL queries, spans with errors, time spent by service, and a trace ID search that lists one request's spans.
6. **Platform — the rest of the account.** Scheduler invocations, image pulls from ECR, log bytes ingested by group (what CloudWatch Logs costs), CloudWatch API calls (what Grafana costs).

Each panel carries a one-line description of what it measures and when to worry.

## Open questions

- ~~Can Grafana's Application Signals data source open any trace by ID?~~ Answered 2026-11-17: its plugin couldn't be installed through Grafana's API, and isn't needed: the Traces dashboard reads `aws/spans` with Logs Insights, which holds every span. Installing it by hand (Administration → Plugins) would add a waterfall view; optional.
- Who is the second user? — who should answer: the owner (they invite them in Grafana).

## Needs Itaca engineering

- **Yes:** an IAM role trusted by an external service (Grafana Cloud's AWS account) is on the "When to stop" list (integrations, AWS settings). The owner asked the agent to build it end to end on 2026-11-17; the decision and its limits (read-only, external ID, the project's log groups only) are recorded in `docs/DECISIONS.md` for Itaca engineering to review.
