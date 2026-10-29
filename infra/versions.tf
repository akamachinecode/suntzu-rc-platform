# Infrastructure as code (Terraform). Docs: docs/DEPLOY.md.
# Changing this folder changes production. Ask Itaca engineering before editing.
#
# Versions are pinned exactly (at least 7 days old) and the providers' checksums are in
# .terraform.lock.hcl, so every machine and CI run uses the same code. Terraform itself is pinned
# in .github/workflows/deploy.yml. The code also runs on OpenTofu.
terraform {
  required_version = ">= 1.11.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.69.1"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.28.1"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.9.1"
    }
  }

  # State lives in the S3 bucket created during setup. Its name includes the AWS account ID, so it
  # is passed at init: terraform init -backend-config="bucket=rc-landing-tfstate-<account-id>"
  backend "s3" {
    key          = "terraform.tfstate"
    region       = "us-east-2"
    encrypt      = true
    use_lockfile = true
  }
}
