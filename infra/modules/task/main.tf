# One container task on AWS Fargate with no load balancer: it runs one command to the end and stops.
# With a schedule, EventBridge Scheduler starts it; without one, it is run by hand
# (.github/workflows/task.yml).
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

locals {
  # Secrets can be given by parameter name (/<project>/<stage>/<name>) or by ARN.
  secret_arns = {
    for name, parameter in var.secrets : name => (
      startswith(parameter, "arn:") ? parameter : "arn:aws:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter${parameter}"
    )
  }
  family = "${var.name}-${var.task}"
}

resource "aws_cloudwatch_log_group" "task" {
  name              = "/ecs/${var.name}/${var.task}"
  retention_in_days = 30
}

data "aws_iam_policy_document" "ecs_tasks" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Used by ECS to pull the image, write the logs and read the container's secrets.
resource "aws_iam_role" "execution" {
  name_prefix        = "${substr(local.family, 0, 32)}-"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "secrets" {
  count = length(var.secrets) > 0 ? 1 : 0

  statement {
    actions   = ["ssm:GetParameters"]
    resources = values(local.secret_arns)
  }
}

resource "aws_iam_role_policy" "secrets" {
  count = length(var.secrets) > 0 ? 1 : 0

  name   = "read-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.secrets[0].json
}

# The code's own AWS permissions: the policies in var.policy_arns.
resource "aws_iam_role" "task" {
  name_prefix        = "${substr(local.family, 0, 32)}-"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks.json
}

resource "aws_iam_role_policy_attachment" "task" {
  count = length(var.policy_arns)

  role       = aws_iam_role.task.name
  policy_arn = var.policy_arns[count.index]
}

resource "aws_ecs_task_definition" "task" {
  family                   = local.family
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name        = var.task
      image       = var.image
      essential   = true
      command     = var.command
      environment = [for name, value in var.environment : { name = name, value = value }]
      # Secrets are read from SSM Parameter Store when the container starts; they never appear here.
      secrets = [for name, arn in local.secret_arns : { name = name, valueFrom = arn }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.task.name
          awslogs-region        = data.aws_region.current.region
          awslogs-stream-prefix = var.task
        }
      }
    }
  ])
}

# The schedule: EventBridge Scheduler starts the task with this role.
data "aws_iam_policy_document" "scheduler_trust" {
  count = var.schedule == null ? 0 : 1

  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_iam_role" "scheduler" {
  count = var.schedule == null ? 0 : 1

  name_prefix        = "${substr("${local.family}-schedule", 0, 32)}-"
  assume_role_policy = data.aws_iam_policy_document.scheduler_trust[0].json
}

data "aws_iam_policy_document" "scheduler" {
  count = var.schedule == null ? 0 : 1

  statement {
    actions   = ["ecs:RunTask"]
    resources = ["arn:aws:ecs:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:task-definition/${local.family}:*"]

    condition {
      test     = "ArnEquals"
      variable = "ecs:cluster"
      values   = [var.cluster_arn]
    }
  }

  statement {
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.execution.arn, aws_iam_role.task.arn]

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "scheduler" {
  count = var.schedule == null ? 0 : 1

  name   = "run-task"
  role   = aws_iam_role.scheduler[0].id
  policy = data.aws_iam_policy_document.scheduler[0].json
}

resource "aws_scheduler_schedule" "task" {
  count = var.schedule == null ? 0 : 1

  name                         = local.family
  schedule_expression          = var.schedule
  schedule_expression_timezone = var.timezone

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = var.cluster_arn
    role_arn = aws_iam_role.scheduler[0].arn

    ecs_parameters {
      task_definition_arn = aws_ecs_task_definition.task.arn
      launch_type         = "FARGATE"
      task_count          = 1

      network_configuration {
        subnets          = var.subnet_ids
        security_groups  = var.security_group_ids
        assign_public_ip = true
      }
    }

    # A run that can't start within the hour is skipped: the next one comes soon enough.
    retry_policy {
      maximum_event_age_in_seconds = 3600
      maximum_retry_attempts       = 3
    }
  }

  depends_on = [aws_iam_role_policy.scheduler]
}
