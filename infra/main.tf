# apps/app: the public site and the app. Next.js (standalone server) in a container on AWS Fargate.
# apps/api: NestJS in a container on AWS Fargate. It applies database migrations when it starts.
# Scheduled jobs (jobs.tf): the API's image, one command each. Email (email.tf), engine snapshots
# (storage.tf) and the code's AWS permissions (permissions.tf) have their own files.
# Database: PostgreSQL on Amazon RDS in private subnets, reachable only from the API and the jobs.
# The app and the API share one load balancer; everything sits behind Cloudflare.

data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

module "zone" {
  source = "./modules/zone"
  domain = var.hosts.app
}

module "network" {
  source = "./modules/network"
  name   = local.name
}

module "load_balancer" {
  source = "./modules/load-balancer"

  name       = local.name
  vpc_id     = module.network.vpc_id
  vpc_cidr   = module.network.vpc_cidr
  subnet_ids = module.network.public_subnet_ids
  hosts      = concat([var.hosts.app, var.hosts.api], var.redirects)
  zone_id    = module.zone.id
  protect    = local.is_production
}

# The bare domain (and any other redirect) goes to the app, keeping the path and the query.
resource "aws_lb_listener_rule" "redirect" {
  count = length(var.redirects) > 0 ? 1 : 0

  listener_arn = module.load_balancer.https_listener_arn
  priority     = 5

  action {
    type = "redirect"

    redirect {
      host        = var.hosts.app
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  condition {
    host_header {
      values = var.redirects
    }
  }
}

resource "aws_ecs_cluster" "main" {
  name = local.name
}

module "database" {
  source = "./modules/database"

  name             = local.name
  vpc_id           = module.network.vpc_id
  subnet_ids       = module.network.private_subnet_ids
  parameter_prefix = local.parameter_prefix
  engine_version   = "18"
  protect          = local.is_production
}

# Created once by infra/bootstrap.
data "aws_ecr_repository" "app" {
  name = "${local.project}-app"
}

data "aws_ecr_repository" "api" {
  name = "${local.project}-api"
}

locals {
  api_image = "${data.aws_ecr_repository.api.repository_url}:${var.image_tag}"

  # What the API and its scheduled jobs share: the settings, and the secrets in secrets.tf.
  api_environment = {
    API_URL = "https://${var.hosts.api}"
    APP_URL = "https://${var.hosts.app}"
    # The app and the API share this parent domain, so the sign-in cookie works for both.
    COOKIE_DOMAIN       = var.cookie_domain
    AWS_REGION          = data.aws_region.current.region
    MAIL_TRANSPORT      = "ses"
    MAIL_FROM           = var.email.from
    ENGINE_SNAPSHOT_DIR = "s3://${aws_s3_bucket.snapshots.bucket}"
    # AI extraction of pasted flyers (Claude on Bedrock). Needs model access in the Bedrock console
    # of this region; until then submissions fall back to the crew's inbox.
    BEDROCK_MODEL_ID          = "anthropic.claude-opus-5-5"
    BEDROCK_FALLBACK_MODEL_ID = "anthropic.claude-opus-4-8"
  }
}

module "app" {
  source = "./modules/service"

  name                  = local.name
  service               = "app"
  cluster_arn           = aws_ecs_cluster.main.arn
  vpc_id                = module.network.vpc_id
  subnet_ids            = module.network.public_subnet_ids
  listener_arn          = module.load_balancer.https_listener_arn
  alb_security_group_id = module.load_balancer.security_group_id
  host                  = var.hosts.app
  priority              = 10
  origin_lock           = local.origin_lock
  origin_verify_header  = local.origin_verify_header
  image                 = "${data.aws_ecr_repository.app.repository_url}:${var.image_tag}"
  port                  = 3000
  health_check_path     = "/api/health"
  cpu                   = 512
  memory                = 1024
  # Server-only variables. NEXT_PUBLIC_* values are baked into the image at build time (deploy.yml).
  environment = {
    API_URL = "https://${var.hosts.api}"
  }
}

module "api" {
  source = "./modules/service"

  name                  = local.name
  service               = "api"
  cluster_arn           = aws_ecs_cluster.main.arn
  vpc_id                = module.network.vpc_id
  subnet_ids            = module.network.public_subnet_ids
  security_group_ids    = [module.database.client_security_group_id]
  listener_arn          = module.load_balancer.https_listener_arn
  alb_security_group_id = module.load_balancer.security_group_id
  host                  = var.hosts.api
  priority              = 20
  origin_lock           = local.origin_lock
  origin_verify_header  = local.origin_verify_header
  image                 = local.api_image
  port                  = 3001
  health_check_path     = "/health"
  cpu                   = 256
  memory                = 512
  environment           = local.api_environment
  # Read from SSM Parameter Store when the container starts (secrets.tf, docs/DEPLOY.md).
  secrets = local.api_secrets
}

resource "aws_iam_role_policy_attachment" "api" {
  role       = module.api.task_role_name
  policy_arn = aws_iam_policy.code.arn
}
