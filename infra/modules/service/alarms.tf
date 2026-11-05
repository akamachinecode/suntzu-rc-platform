# The service's alarms (docs/OPERATIONS.md): built on metrics AWS records anyway (load balancer and
# ECS) and on the service's own error log lines, so they keep working even if tracing doesn't.
locals {
  alarms       = var.alarms != null ? { on = var.alarms } : {}
  cluster_name = element(split("/", var.cluster_arn), 1)
  target       = { TargetGroup = aws_lb_target_group.service.arn_suffix, LoadBalancer = try(var.alarms.load_balancer, "") }
  ecs          = { ClusterName = local.cluster_name, ServiceName = var.service }
}

# Share of requests answered with a server error (500–599), over 5 minutes with some traffic.
resource "aws_cloudwatch_metric_alarm" "errors_5xx" {
  for_each = local.alarms

  alarm_name          = "${var.name}-${var.service}-5xx"
  alarm_description   = "More than 5% of ${var.host}'s responses were server errors over 5 minutes. Runbook: docs/OPERATIONS.md#errors-5xx"
  evaluation_periods  = 1
  threshold           = 5
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [each.value.critical]
  ok_actions          = [each.value.critical]

  metric_query {
    id          = "rate"
    expression  = "IF(requests >= 10, 100 * errors / requests, 0)"
    label       = "Server errors (%)"
    return_data = true
  }

  metric_query {
    id = "errors"

    metric {
      namespace   = "AWS/ApplicationELB"
      metric_name = "HTTPCode_Target_5XX_Count"
      dimensions  = local.target
      stat        = "Sum"
      period      = 300
    }
  }

  metric_query {
    id = "requests"

    metric {
      namespace   = "AWS/ApplicationELB"
      metric_name = "RequestCount"
      dimensions  = local.target
      stat        = "Sum"
      period      = 300
    }
  }
}

# No container is passing its health check: the service can't answer at all.
resource "aws_cloudwatch_metric_alarm" "no_healthy_task" {
  for_each = local.alarms

  alarm_name          = "${var.name}-${var.service}-no-healthy-task"
  alarm_description   = "No ${var.service} container is passing its health check (${var.health_check_path}). Runbook: docs/OPERATIONS.md#no-healthy-task"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HealthyHostCount"
  dimensions          = local.target
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [each.value.critical]
  ok_actions          = [each.value.critical]
}

# The slowest 5% of requests.
resource "aws_cloudwatch_metric_alarm" "slow" {
  for_each = local.alarms

  alarm_name          = "${var.name}-${var.service}-slow"
  alarm_description   = "The slowest 5% of ${var.host}'s requests took more than ${each.value.slow_seconds} s for 15 minutes. Runbook: docs/OPERATIONS.md#slow-responses"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "TargetResponseTime"
  dimensions          = local.target
  extended_statistic  = "p95"
  period              = 300
  evaluation_periods  = 3
  threshold           = each.value.slow_seconds
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [each.value.warning]
  ok_actions          = [each.value.warning]
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  for_each = local.alarms

  alarm_name          = "${var.name}-${var.service}-cpu"
  alarm_description   = "${var.service} used more than 85% of its CPU for 15 minutes. Runbook: docs/OPERATIONS.md#cpu-high"
  namespace           = "AWS/ECS"
  metric_name         = "CPUUtilization"
  dimensions          = local.ecs
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = 85
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [each.value.warning]
  ok_actions          = [each.value.warning]
}

resource "aws_cloudwatch_metric_alarm" "memory" {
  for_each = local.alarms

  alarm_name          = "${var.name}-${var.service}-memory"
  alarm_description   = "${var.service} used more than 85% of its memory for 15 minutes. Runbook: docs/OPERATIONS.md#memory-high"
  namespace           = "AWS/ECS"
  metric_name         = "MemoryUtilization"
  dimensions          = local.ecs
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = 85
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [each.value.warning]
  ok_actions          = [each.value.warning]
}

# Log lines with "level": "error" or "fatal" (the JSON logs of apps/api and apps/app) become a
# metric. Lines that aren't JSON are ignored.
resource "aws_cloudwatch_log_metric_filter" "errors" {
  for_each = local.alarms

  name           = "${var.service}-errors"
  log_group_name = aws_cloudwatch_log_group.service.name
  pattern        = "{ ($.level = \"error\") || ($.level = \"fatal\") }"

  metric_transformation {
    name      = "${var.service}-errors"
    namespace = var.name
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "error_logs" {
  for_each = local.alarms

  alarm_name          = "${var.name}-${var.service}-error-logs"
  alarm_description   = "${var.service} logged ${each.value.error_logs} or more errors in 5 minutes. Runbook: docs/OPERATIONS.md#error-logs"
  namespace           = var.name
  metric_name         = aws_cloudwatch_log_metric_filter.errors[each.key].metric_transformation[0].name
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = each.value.error_logs
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [each.value.warning]
  ok_actions          = [each.value.warning]
}
