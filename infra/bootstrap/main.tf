data "aws_caller_identity" "current" {}

locals {
  project      = "rc-landing"
  state_bucket = "${local.project}-tfstate-${data.aws_caller_identity.current.account_id}"
}

# The state bucket: versioned (every previous state can be recovered), encrypted and private.
resource "aws_s3_bucket_versioning" "state" {
  bucket = local.state_bucket

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = local.state_bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = local.state_bucket
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# GitHub's OpenID Connect provider: lets workflows get short-lived AWS credentials, no access keys.
resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1

  url = "https://token.actions.githubusercontent.com"
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

# Only this repository's deploy jobs, running in one of the listed GitHub environments, can use it.
data "aws_iam_policy_document" "github" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [for environment in var.github_environments : "${var.github_subject}:environment:${environment}"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = "${local.project}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github.json
}

resource "aws_iam_role_policy_attachment" "deploy" {
  role       = aws_iam_role.deploy.name
  policy_arn = var.deploy_policy_arn
}

# Container images, shared by every stage and tagged <stage>-<commit>. Tags can't be overwritten.
resource "aws_ecr_repository" "image" {
  for_each = toset(local.images)

  name                 = "${local.project}-${each.key}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "image" {
  for_each = aws_ecr_repository.image

  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 30 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 30
      }
      action = { type = "expire" }
    }]
  })
}
