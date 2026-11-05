output "https_listener_arn" {
  value = aws_lb_listener.https.arn
}

output "security_group_id" {
  value = aws_security_group.alb.id
}

output "arn_suffix" {
  description = "Identifies the load balancer in CloudWatch metrics."
  value       = aws_lb.main.arn_suffix
}
