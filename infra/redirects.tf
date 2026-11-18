# The bare domain (and any other hostname in `redirects`) sends visitors to the app's hostname,
# keeping the path and the query: suntzurc.com/events → https://www.suntzurc.com/events.
# The load balancer answers these itself; they never reach the app. Priority 5, as when this rule
# lived in main.tf (the template uses 1): moving it between files changes nothing in AWS.
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
