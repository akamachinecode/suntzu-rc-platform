/// <reference path="./.sst/platform/config.d.ts" />

// Infrastructure as code (SST v4 → Pulumi). Docs: https://sst.dev/docs/component/aws/service,
// https://sst.dev/docs/component/aws/postgres and https://sst.dev/docs/component/aws/nextjs
// Changing this file changes production. Ask Itaca engineering before editing.
export default $config({
  app(input) {
    return {
      name: "rc-landing",
      home: "aws",
      // Production resources survive `sst remove` and can't be deleted by accident.
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      providers: {
        aws: { region: "us-east-1" },
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
      isProduction ? `${name}.example.com` : `${name}-${$app.stage}.example.com`;
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

    // apps/api: Docker container on AWS Fargate (always on, no servers to maintain) behind a
    // load balancer. It applies database migrations when it starts.
    const cluster = new sst.aws.Cluster("Cluster", { vpc });
    const api = new sst.aws.Service("Api", {
      cluster,
      image: { context: ".", dockerfile: "apps/api/Dockerfile" },
      link: [database, authSecret],
      environment: {
        // TLS to RDS, verified against the RDS certificate bundle baked into the image.
        DATABASE_URL: $interpolate`postgres://${database.username}:${database.password}@${database.host}:${database.port}/${database.database}?sslmode=verify-full`,
        BETTER_AUTH_SECRET: authSecret.value,
        API_URL: apiUrl,
        APP_URL: appUrl,
        COOKIE_DOMAIN: "example.com",
      },
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

    // apps/app: the public site and the app. Next.js on AWS Lambda + CloudFront + S3, built with
    // OpenNext. In production the bare domain redirects to www.
    const app = new sst.aws.Nextjs("App", {
      path: "apps/app",
      // OpenNext 4.x is required for Next.js 16 (SST's default is 3.x).
      openNextVersion: "4.1.12",
      domain: isProduction
        ? { name: host("www"), redirects: ["example.com"], dns }
        : { name: host("www"), dns },
      environment: {
        NEXT_PUBLIC_SITE_URL: appUrl,
        NEXT_PUBLIC_API_URL: apiUrl,
        API_URL: apiUrl,
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
