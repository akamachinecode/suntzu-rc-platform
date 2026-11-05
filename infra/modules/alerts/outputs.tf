output "critical" {
  description = "Topic for alarms that mean users are affected now."
  value       = aws_sns_topic.alerts["critical"].arn
}

output "warning" {
  description = "Topic for alarms that need a look today."
  value       = aws_sns_topic.alerts["warning"].arn
}

output "critical_us_east_1" {
  description = "Critical topic in us-east-1, for alarms on metrics that only exist there."
  value       = try(aws_sns_topic.alerts["critical-us-east-1"].arn, aws_sns_topic.alerts["critical"].arn)
}
