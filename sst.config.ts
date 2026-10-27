/// <reference path="./.sst/platform/config.d.ts" />

// Infrastructure as code (SST v4 → Pulumi). Docs: https://sst.dev/docs/component/aws/service,
// https://sst.dev/docs/component/aws/postgres and https://sst.dev/docs/component/aws/nextjs
// Changing this file changes production. Ask Itaca engineering before editing.

// Servo's domain: the one line to change once the name and domain are chosen (C3, docs/LAUNCH.md).
const DOMAIN = "example.com";

export default $config({
  app(input) {
    return {
      name: "rc-landing",
      home: "aws",
      // Production resources survive `sst remove` and can't be deleted by accident.
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      providers: {
        // The AWS project only allows its own region (docs/DECISIONS.md, 2026-10-22 and C1).
        aws: { region: "us-east-2" },
        // Pinned like every dependency (at least 7 days old); upgrade it together with SST.
        cloudflare: { package: "@pulumi/cloudflare", version: "6.22.1" },
      },
    };
  },
  async run() {
    const isProduction = $app.stage === "production";
    // DNS records and TLS certificates are created in Cloudflare/ACM automatically; traffic is
    // proxied by Cloudflare. The site and the API share the parent domain, so the sign-in cookie
    // works for both: production uses www./api.example.com, other stages www-<stage>./api-<stage>.
    // Servo has no separate marketing site: apps/app is the public site, so it takes www.
    const dns = sst.cloudflare.dns({ proxy: true });
    const host = (name: string) =>
      isProduction ? `${name}.${DOMAIN}` : `${name}-${$app.stage}.${DOMAIN}`;
    const appUrl = `https://${host("www")}`;
    const apiUrl = `https://${host("api")}`;

    // Network: private subnets for the database and the API. A small NAT instance lets the API
    // reach the internet (AWS APIs, email) without being reachable from it.
    const vpc = new sst.aws.Vpc("Vpc", { nat: "ec2" });

    // PostgreSQL on Amazon RDS, in the private subnets.
    const database = new sst.aws.Postgres("Database", { vpc, version: "18" });

    // Secrets: `pnpm sst secret set BetterAuthSecret "$(openssl rand -base64 32)" --stage <stage>`.
    const authSecret = new sst.Secret("BetterAuthSecret");
    // Secret header that Cloudflare adds to every request (origin lock). "off" until enabled:
    //   pnpm sst secret set OriginVerifyHeader <value> --stage <stage>
    const originVerify = new sst.Secret("OriginVerifyHeader", "off");
    // Cloudflare's published IP ranges: the API's load balancer only accepts connections from them.
    const cloudflareIps = (await (
      await fetch("https://api.cloudflare.com/client/v4/ips")
    ).json()) as {
      result: { ipv4_cidrs: string[]; ipv6_cidrs: string[] };
    };

    // Optional secrets: empty until set, and the feature stays off until then (docs/LAUNCH.md).
    //   pnpm sst secret set CrewEmails "ana@…,ben@…" --stage <stage>
    const crewEmails = new sst.Secret("CrewEmails", "");
    const crewInbox = new sst.Secret("CrewInbox", "");
    const googleClientId = new sst.Secret("GoogleClientId", "");
    const googleClientSecret = new sst.Secret("GoogleClientSecret", "");
    const turnstileSecret = new sst.Secret("TurnstileSecretKey", "");
    const turnstileSiteKey = new sst.Secret("TurnstileSiteKey", "");

    // Email: Amazon SES sending from the domain; SST adds the DKIM and DMARC records in Cloudflare.
    const email = new sst.aws.Email("Email", { sender: DOMAIN, dns: sst.cloudflare.dns() });
    // Raw pages and feeds the engine reads (it re-reads them when a source says "not modified").
    const snapshots = new sst.aws.Bucket("Snapshots");

    // What the API and its scheduled jobs share: the database, the secrets and the settings.
    const link = [
      database,
      authSecret,
      email,
      snapshots,
      crewEmails,
      crewInbox,
      googleClientId,
      googleClientSecret,
      turnstileSecret,
    ];
    const environment = {
      // TLS to RDS, verified against the RDS certificate bundle baked into the image.
      DATABASE_URL: $interpolate`postgres://${database.username}:${database.password}@${database.host}:${database.port}/${database.database}?sslmode=verify-full`,
      BETTER_AUTH_SECRET: authSecret.value,
      API_URL: apiUrl,
      APP_URL: appUrl,
      COOKIE_DOMAIN: DOMAIN,
      MAIL_TRANSPORT: "ses",
      MAIL_FROM: `Servo <hello@${DOMAIN}>`,
      CREW_EMAILS: crewEmails.value,
      CREW_INBOX: crewInbox.value,
      GOOGLE_CLIENT_ID: googleClientId.value,
      GOOGLE_CLIENT_SECRET: googleClientSecret.value,
      TURNSTILE_SECRET_KEY: turnstileSecret.value,
      ENGINE_SNAPSHOT_DIR: $interpolate`s3://${snapshots.name}`,
      // AI extraction of pasted flyers (Claude on Bedrock). Needs model access in the Bedrock
      // console of this region; until then submissions fall back to the crew's inbox.
      BEDROCK_MODEL_ID: "anthropic.claude-opus-5-5",
      BEDROCK_FALLBACK_MODEL_ID: "anthropic.claude-opus-4-8",
    };
    const permissions = [
      {
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: ["*"],
      },
    ];

    // apps/api: Docker container on AWS Fargate (always on, no servers to maintain) behind a
    // load balancer. It applies database migrations when it starts.
    const cluster = new sst.aws.Cluster("Cluster", { vpc });
    const image = { context: ".", dockerfile: "apps/api/Dockerfile" };
    const api = new sst.aws.Service("Api", {
      cluster,
      image,
      link,
      permissions,
      environment,
      loadBalancer: {
        domain: { name: host("api"), dns },
        // With the origin lock on, only requests carrying Cloudflare's secret header are forwarded;
        // the load balancer answers 403 to everything else.
        rules: originVerify.value.apply((secret) => [
          { listen: "80/http" as const, redirect: "443/https" as const },
          secret === "off"
            ? { listen: "443/https" as const, forward: "3001/http" as const }
            : {
                listen: "443/https" as const,
                forward: "3001/http" as const,
                conditions: { header: { name: "x-origin-verify", values: [secret] } },
              },
        ]),
        health: { "3001/http": { path: "/health" } },
      },
      transform: {
        loadBalancerSecurityGroup: (args) => {
          args.ingress = [80, 443].map((port) => ({
            protocol: "tcp",
            fromPort: port,
            toPort: port,
            cidrBlocks: cloudflareIps.result.ipv4_cidrs,
            ipv6CidrBlocks: cloudflareIps.result.ipv6_cidrs,
          }));
        },
      },
    });

    // Scheduled jobs: the same image as the API, one command each (times in Florida).
    const job = (name: string, command: string[]) =>
      new sst.aws.Task(name, { cluster, image, command, link, permissions, environment });
    // Read every active source and resolve what they say, four times a day.
    new sst.aws.CronV2("EngineSchedule", {
      task: job("Engine", ["node", "dist/engine.js"]),
      schedule: "cron(0 5,11,17,23 * * ? *)",
      timezone: "America/New_York",
    });
    // Change alerts every hour; the weekly digest (Thursday) and club reports (the 1st) inside it.
    new sst.aws.CronV2("NotifySchedule", {
      task: job("Notify", ["node", "dist/notify.js"]),
      schedule: "cron(15 * * * ? *)",
      timezone: "America/New_York",
    });
    // The FAA registers and Census ZIP codes change slowly: refresh them once a month.
    new sst.aws.CronV2("CensusSchedule", {
      task: job("Census", ["node", "dist/census.js"]),
      schedule: "cron(0 4 2 * ? *)",
      timezone: "America/New_York",
    });

    // Run once after the first deploy of a stage (docs/LAUNCH.md): the hand-checked events, places
    // and sources, the FAA census and a first read of every source. Safe to run again.
    job("Setup", ["sh", "-c", "node dist/seed.js && node dist/census.js && node dist/engine.js"]);

    // apps/app: the public site and the app. Next.js on AWS Lambda + CloudFront + S3, built with
    // OpenNext. In production the bare domain redirects to www.
    const app = new sst.aws.Nextjs("App", {
      path: "apps/app",
      // OpenNext 4.x is required for Next.js 16 (SST's default is 3.x).
      openNextVersion: "4.1.12",
      domain: isProduction
        ? { name: host("www"), redirects: [DOMAIN], dns }
        : { name: host("www"), dns },
      environment: {
        NEXT_PUBLIC_SITE_URL: appUrl,
        NEXT_PUBLIC_API_URL: apiUrl,
        API_URL: apiUrl,
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: turnstileSiteKey.value,
        NEXT_PUBLIC_GOOGLE_SIGN_IN: googleClientId.value.apply((id) => (id ? "true" : "false")),
      },
      edge: { viewerRequest: { injection: originLock(originVerify) } },
    });

    return { app: app.url, api: api.url };
  },
});

// Origin lock (docs/CLOUDFLARE.md): CloudFront Function code that answers 403 to requests that
// didn't come through Cloudflare. Inactive while the OriginVerifyHeader secret is "off".
function originLock(secret: sst.Secret) {
  return $interpolate`if ("${secret.value}" !== "off") {
    var originVerify = event.request.headers["x-origin-verify"];
    if (!originVerify || originVerify.value !== "${secret.value}") {
      return { statusCode: 403, statusDescription: "Forbidden" };
    }
  }`;
}
