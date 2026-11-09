# One-time setup of the AWS account, run by an admin from a laptop (docs/DEPLOY.md): the deploy role
# GitHub Actions uses, the container registries and the state bucket's settings.
terraform {
  required_version = ">= 1.11.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.71.0"
    }
  }

  # Same bucket as the main state (created with the AWS CLI first), different key.
  backend "s3" {
    key          = "bootstrap.tfstate"
    region       = "us-east-2"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "us-east-2"

  default_tags {
    tags = {
      Project   = "rc-landing"
      ManagedBy = "terraform"
    }
  }
}
