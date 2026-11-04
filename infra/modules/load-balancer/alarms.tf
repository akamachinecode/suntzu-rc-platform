# Errors returned by the load balancer itself: no healthy container to send the request to, or a
# container that closed the connection or timed out (docs/OPERATIONS.md#load-balancer-5xx).
resource "aws_cloudwatch_metric_alarm" "elb_5xx" {
  count = var.alarms != null ? 1 : 0

  alarm_name          = "${var.name}-load-balancer-5xx"
  alarm_description   = "The load balancer answered 5 or more errors (502, 503, 504) in 5 minutes. Runbook: docs/OPERATIONS.md#load-balancer-5xx"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_ELB_5XX_Count"
  dimensions          = { LoadBalancer = aws_lb.main.arn_suffix }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 5
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [var.alarms.critical]
  ok_actions          = [var.alarms.critical]
}
