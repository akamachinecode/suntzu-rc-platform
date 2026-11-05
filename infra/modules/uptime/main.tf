# Is the site up? Route 53 opens each URL every 30 seconds from three regions, through Cloudflare,
# like a visitor would, so a DNS mistake, a WAF rule or a broken origin lock is caught too, not
# only a stopped container (docs/OPERATIONS.md#site-down). Its metrics only exist in us-east-1.
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

resource "aws_route53_health_check" "site" {
  for_each = var.checks

  type              = "HTTPS"
  fqdn              = each.value.host
  port              = 443
  resource_path     = each.value.path
  enable_sni        = true
  request_interval  = 30
  failure_threshold = 3
  regions           = ["us-east-1", "us-west-2", "eu-west-1"]

  tags = {
    Name = "${var.name}-${each.key}"
  }
}

resource "aws_cloudwatch_metric_alarm" "site_down" {
  for_each = var.checks

  region              = "us-east-1"
  alarm_name          = "${var.name}-${each.key}-down"
  alarm_description   = "https://${each.value.host}${each.value.path} doesn't answer from the internet. Runbook: docs/OPERATIONS.md#site-down"
  namespace           = "AWS/Route53"
  metric_name         = "HealthCheckStatus"
  dimensions          = { HealthCheckId = aws_route53_health_check.site[each.key].id }
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"
  alarm_actions       = [var.topic]
  ok_actions          = [var.topic]
}
