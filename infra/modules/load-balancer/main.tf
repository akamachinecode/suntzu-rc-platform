# Application load balancer for the containers, behind Cloudflare. Each service adds a rule for its
# hostname (modules/service); anything else gets a 403.
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

# Cloudflare's published IP ranges, read at every deploy.
data "cloudflare_ip_ranges" "cloudflare" {}

# Origin lock, part 1: only Cloudflare can open a connection to the load balancer.
resource "aws_security_group" "alb" {
  name_prefix = "${var.name}-alb-"
  description = "Load balancer: HTTP and HTTPS from Cloudflare only"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP from Cloudflare (redirected to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = data.cloudflare_ip_ranges.cloudflare.ipv4_cidrs
  }

  ingress {
    description = "HTTPS from Cloudflare"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = data.cloudflare_ip_ranges.cloudflare.ipv4_cidrs
  }

  egress {
    description = "To the containers"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb" "main" {
  name                       = trimsuffix(substr(var.name, 0, 32), "-")
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = var.subnet_ids
  drop_invalid_header_fields = true
  enable_deletion_protection = var.protect
}

resource "aws_acm_certificate" "alb" {
  domain_name               = var.hosts[0]
  subject_alternative_names = slice(var.hosts, 1, length(var.hosts))
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Validation records are DNS only (grey cloud): ACM has to see them directly.
resource "cloudflare_dns_record" "validation" {
  for_each = {
    for option in aws_acm_certificate.alb.domain_validation_options : option.domain_name => option
  }

  zone_id = var.zone_id
  name    = trimsuffix(each.value.resource_record_name, ".")
  type    = each.value.resource_record_type
  content = trimsuffix(each.value.resource_record_value, ".")
  ttl     = 60
  proxied = false
}

resource "aws_acm_certificate_validation" "alb" {
  certificate_arn = aws_acm_certificate.alb.arn
  depends_on      = [cloudflare_dns_record.validation]
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.alb.certificate_arn

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Forbidden"
      status_code  = "403"
    }
  }
}

# The hostnames point at the load balancer through Cloudflare's proxy (orange cloud).
resource "cloudflare_dns_record" "host" {
  for_each = toset(var.hosts)

  zone_id = var.zone_id
  name    = each.key
  type    = "CNAME"
  content = aws_lb.main.dns_name
  ttl     = 1
  proxied = true
}
