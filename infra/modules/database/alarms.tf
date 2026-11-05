# The database's alarms and events (docs/OPERATIONS.md). Thresholds suit the db.t4g.micro instance:
# about 1 GB of memory, around 80 connections, CPU credits that run out under sustained load.
locals {
  alarms   = var.alarms != null ? { on = var.alarms } : {}
  instance = { DBInstanceIdentifier = aws_db_instance.database.identifier }
}

resource "aws_cloudwatch_metric_alarm" "storage" {
  for_each = local.alarms

  alarm_name          = "${var.name}-database-storage"
  alarm_description   = "The database has less than 2 GB of free disk. Runbook: docs/OPERATIONS.md#database-storage"
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  dimensions          = local.instance
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 2 * 1024 * 1024 * 1024
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [each.value.critical]
  ok_actions          = [each.value.critical]
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  for_each = local.alarms

  alarm_name          = "${var.name}-database-cpu"
  alarm_description   = "The database used more than 80% of its CPU for 15 minutes. Runbook: docs/OPERATIONS.md#database-cpu"
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"
  dimensions          = local.instance
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [each.value.warning]
  ok_actions          = [each.value.warning]
}

resource "aws_cloudwatch_metric_alarm" "cpu_credits" {
  for_each = local.alarms

  alarm_name          = "${var.name}-database-cpu-credits"
  alarm_description   = "The database is running out of CPU credits; when they reach 0 it slows down. Runbook: docs/OPERATIONS.md#database-cpu-credits"
  namespace           = "AWS/RDS"
  metric_name         = "CPUCreditBalance"
  dimensions          = local.instance
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 3
  threshold           = 20
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [each.value.warning]
  ok_actions          = [each.value.warning]
}

resource "aws_cloudwatch_metric_alarm" "memory" {
  for_each = local.alarms

  alarm_name          = "${var.name}-database-memory"
  alarm_description   = "The database has less than 64 MB of free memory. Runbook: docs/OPERATIONS.md#database-memory"
  namespace           = "AWS/RDS"
  metric_name         = "FreeableMemory"
  dimensions          = local.instance
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = 64 * 1024 * 1024
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [each.value.warning]
  ok_actions          = [each.value.warning]
}

resource "aws_cloudwatch_metric_alarm" "connections" {
  for_each = local.alarms

  alarm_name          = "${var.name}-database-connections"
  alarm_description   = "More than 60 open connections to the database for 15 minutes. Runbook: docs/OPERATIONS.md#database-connections"
  namespace           = "AWS/RDS"
  metric_name         = "DatabaseConnections"
  dimensions          = local.instance
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 3
  threshold           = 60
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [each.value.warning]
  ok_actions          = [each.value.warning]
}

# Failovers, failures, maintenance and low storage, as RDS reports them (docs/OPERATIONS.md#database-event).
resource "aws_db_event_subscription" "database" {
  for_each = local.alarms

  name             = "${var.name}-database"
  sns_topic        = each.value.warning
  source_type      = "db-instance"
  source_ids       = [aws_db_instance.database.identifier]
  event_categories = ["availability", "failover", "failure", "low storage", "maintenance"]
}
