# One container on AWS Fargate (no servers to maintain) behind the load balancer, for one hostname.
# Deploys are rolling: the new container must pass its health check before the old one stops, and
# a version that never gets healthy is rolled back automatically.
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
}

resource "aws_cloudwatch_log_group" "service" {
  name              = "/ecs/${var.name}/${var.service}"
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
  name_prefix        = "${substr("${var.name}-${var.service}", 0, 32)}-"
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

# The code's own AWS permissions (S3, SES, …): none yet. Attach policies to this role when it needs them.
resource "aws_iam_role" "task" {
  name_prefix        = "${substr("${var.name}-${var.service}", 0, 32)}-"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks.json
}

resource "aws_ecs_task_definition" "service" {
  family                   = "${var.name}-${var.service}"
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

  container_definitions = jsonencode(concat([
    merge({
      name         = var.service
      image        = var.image
      essential    = true
      portMappings = [{ containerPort = var.port, protocol = "tcp" }]
      environment  = [for name, value in merge(local.telemetry_environment, var.environment) : { name = name, value = value }]
      # Secrets are read from SSM Parameter Store when the container starts; they never appear here.
      secrets = [for name, arn in local.secret_arns : { name = name, valueFrom = arn }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.service.name
          awslogs-region        = data.aws_region.current.region
          awslogs-stream-prefix = var.service
        }
      }
    }, local.telemetry ? { dependsOn = [{ containerName = "otel", condition = "START" }] } : {})
  ], local.telemetry ? [local.collector] : []))
}

resource "aws_security_group" "service" {
  name_prefix = "${var.name}-${var.service}-"
  description = "${var.service}: traffic from the load balancer only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "From the load balancer"
    from_port       = var.port
    to_port         = var.port
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

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

resource "aws_lb_target_group" "service" {
  name                 = "${trimsuffix(substr(var.name, 0, 31 - length(var.service)), "-")}-${var.service}"
  port                 = var.port
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = var.vpc_id
  deregistration_delay = 30

  health_check {
    path                = var.health_check_path
    matcher             = "200"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener_rule" "service" {
  listener_arn = var.listener_arn
  priority     = var.priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service.arn
  }

  condition {
    host_header {
      values = [var.host]
    }
  }

  # Origin lock, part 2: once the secret is set, only requests carrying Cloudflare's header get in.
  dynamic "condition" {
    for_each = var.origin_lock ? [1] : []

    content {
      http_header {
        http_header_name = "X-Origin-Verify"
        values           = [var.origin_verify_header]
      }
    }
  }
}

resource "aws_ecs_service" "service" {
  name                               = var.service
  cluster                            = var.cluster_arn
  task_definition                    = aws_ecs_task_definition.service.arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = 60
  propagate_tags                     = "SERVICE"
  wait_for_steady_state              = true

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = concat([aws_security_group.service.id], var.security_group_ids)
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.service.arn
    container_name   = var.service
    container_port   = var.port
  }

  depends_on = [aws_lb_listener_rule.service, aws_iam_role_policy.secrets, aws_iam_role_policy.remote]
}
