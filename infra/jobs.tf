# Scheduled jobs: the API's image, one command each, with the API's settings, secrets and
# permissions. Times are in Florida. A job that fails leaves its log in CloudWatch
# (/ecs/<project>-<stage>/<job>) and runs again at its next time.
locals {
  jobs = {
    # Read every active source and resolve what they say, four times a day.
    engine = {
      command  = ["node", "dist/engine.js"]
      schedule = "cron(0 5,11,17,23 * * ? *)"
    }
    # Change alerts every hour; the weekly digest (Thursday) and club reports (the 1st) inside it.
    notify = {
      command  = ["node", "dist/notify.js"]
      schedule = "cron(15 * * * ? *)"
    }
    # The FAA registers and Census ZIP codes change slowly: refresh them once a month.
    census = {
      command  = ["node", "dist/census.js"]
      schedule = "cron(0 4 2 * ? *)"
    }
    # Run once after the first deploy of a stage (docs/LAUNCH.md): the hand-checked events, places
    # and sources, the FAA census and a first read of every source. Safe to run again.
    setup = {
      command  = ["sh", "-c", "node dist/seed.js && node dist/census.js && node dist/engine.js"]
      schedule = null
    }
  }
}

# Jobs accept no connections; they only reach out (the database, AWS APIs and the sources).
resource "aws_security_group" "jobs" {
  name_prefix = "${local.name}-jobs-"
  description = "Scheduled jobs: outbound only"
  vpc_id      = module.network.vpc_id

  egress {
    description = "AWS APIs, ECR, the database and the internet"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

module "job" {
  source   = "./modules/task"
  for_each = local.jobs

  name               = local.name
  task               = each.key
  cluster_arn        = aws_ecs_cluster.main.arn
  subnet_ids         = module.network.public_subnet_ids
  security_group_ids = [aws_security_group.jobs.id, module.database.client_security_group_id]
  image              = local.api_image
  command            = each.value.command
  schedule           = each.value.schedule
  timezone           = "America/New_York"
  # The census reads the FAA's registers in memory.
  cpu         = 512
  memory      = 1024
  environment = local.api_environment
  secrets     = local.api_secrets
  policy_arns = [aws_iam_policy.code.arn]
}
