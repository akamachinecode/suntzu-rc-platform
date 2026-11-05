provider "aws" {
  region = "us-east-2"

  default_tags {
    tags = {
      Project   = "rc-landing"
      Stage     = terraform.workspace
      ManagedBy = "terraform"
    }
  }
}

# No us-east-1 provider: SunTzu RC has no CloudFront website (apps/app is the public site, on the load
# balancer), so every resource lives in the AWS project's only region (docs/DECISIONS.md, 2026-10-29).

# Uses the CLOUDFLARE_API_TOKEN environment variable (a GitHub secret in CI).
provider "cloudflare" {}
