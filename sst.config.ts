/// <reference path="./.sst/platform/config.d.ts" />

// Infrastructure as code (SST v4 → Pulumi). Docs: https://sst.dev/docs/component/aws/nextjs
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
        cloudflare: true,
      },
    };
  },
  async run() {
    const isProduction = $app.stage === "production";
    const domain = "example.com";

    // Next.js on AWS Lambda + CloudFront + S3, built with OpenNext.
    const web = new sst.aws.Nextjs("Web", {
      // OpenNext 4.x is required for Next.js 16 (SST's default is 3.x).
      openNextVersion: "4.1.8",
      // Only production gets the real domain. DNS records and the TLS certificate
      // are created in Cloudflare/ACM automatically; traffic is proxied by Cloudflare.
      domain: isProduction ? { name: domain, dns: sst.cloudflare.dns({ proxy: true }) } : undefined,
      // Server secrets: `sst secret set <Name> <value>` + `link: [...]`, never literals here.
      environment: isProduction ? { NEXT_PUBLIC_SITE_URL: `https://${domain}` } : {},
    });

    return { url: web.url };
  },
});
