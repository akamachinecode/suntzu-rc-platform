# Where alarms go (docs/OPERATIONS.md). Two SNS topics per stage: "critical" (users are affected
# now) and "warning" (will affect them if nobody looks today). Each one emails the stage's
# recipients and, when configured, posts to Slack or Microsoft Teams through Amazon Q Developer in
# chat applications. Alarms on metrics that only exist in us-east-1 (Route 53 health checks) need a
# topic there too.
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
  region     = data.aws_region.current.region
  account_id = data.aws_caller_identity.current.account_id

  topics = merge(
    { critical = local.region, warning = local.region },
    local.region == "us-east-1" ? {} : { critical-us-east-1 = "us-east-1" },
  )
}

resource "aws_sns_topic" "alerts" {
  for_each = local.topics

  region = each.value
  # The AWS-managed SNS key can't be used: CloudWatch, EventBridge and AWS Budgets couldn't publish.
  # Alarm messages carry no secrets or personal data.
  name = "${var.name}-${each.key}"

  lifecycle {
    precondition {
      condition     = length(var.emails) > 0 || var.slack != null || var.teams != null
      error_message = "Alarms need someone to receive them: set alerts.emails (or alerts.slack / alerts.teams) in infra/<stage>.tfvars.json. See docs/OPERATIONS.md."
    }
  }
}

# Who may publish: this account (IAM decides who in it), and the AWS services that send alarms and
# events (CloudWatch, EventBridge, RDS, AWS Budgets) on behalf of this account only.
data "aws_iam_policy_document" "alerts" {
  for_each = local.topics

  statement {
    sid       = "ThisAccount"
    actions   = ["sns:Publish", "sns:Subscribe", "sns:GetTopicAttributes", "sns:ListSubscriptionsByTopic"]
    resources = [aws_sns_topic.alerts[each.key].arn]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${local.account_id}:root"]
    }
  }

  statement {
    sid       = "AwsServicesOfThisAccount"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.alerts[each.key].arn]

    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com", "events.amazonaws.com", "events.rds.amazonaws.com", "budgets.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }
}

resource "aws_sns_topic_policy" "alerts" {
  for_each = local.topics

  region = each.value
  arn    = aws_sns_topic.alerts[each.key].arn
  policy = data.aws_iam_policy_document.alerts[each.key].json
}

# Each address receives one confirmation email per topic from AWS: alerts only arrive after
# clicking "Confirm subscription" in each of them.
resource "aws_sns_topic_subscription" "email" {
  for_each = {
    for pair in setproduct(keys(local.topics), var.emails) : "${pair[0]}/${pair[1]}" => {
      topic = pair[0]
      email = pair[1]
    }
  }

  region    = local.topics[each.value.topic]
  topic_arn = aws_sns_topic.alerts[each.value.topic].arn
  protocol  = "email"
  endpoint  = each.value.email
}

# Slack and Teams: Amazon Q Developer in chat applications. Its API only exists in a few regions
# (us-east-2 among them); one configuration can listen to topics in any region.
data "aws_iam_policy_document" "chat_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["chatbot.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "chat" {
  count = var.slack != null || var.teams != null ? 1 : 0

  name_prefix        = "${substr(var.name, 0, 26)}-chat-"
  assume_role_policy = data.aws_iam_policy_document.chat_trust.json
}

# Read-only: enough to show the alarm's graph and logs in the channel, nothing can be changed.
resource "aws_iam_role_policy_attachment" "chat" {
  count = length(aws_iam_role.chat)

  role       = aws_iam_role.chat[0].name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"
}

resource "aws_chatbot_slack_channel_configuration" "alerts" {
  count = var.slack != null ? 1 : 0

  region                = "us-east-2"
  configuration_name    = "${var.name}-alerts"
  slack_team_id         = var.slack.team_id
  slack_channel_id      = var.slack.channel_id
  iam_role_arn          = aws_iam_role.chat[0].arn
  guardrail_policy_arns = ["arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"]
  sns_topic_arns        = [for topic in aws_sns_topic.alerts : topic.arn]
}

resource "aws_chatbot_teams_channel_configuration" "alerts" {
  count = var.teams != null ? 1 : 0

  region                = "us-east-2"
  configuration_name    = "${var.name}-alerts"
  tenant_id             = var.teams.tenant_id
  team_id               = var.teams.team_id
  channel_id            = var.teams.channel_id
  iam_role_arn          = aws_iam_role.chat[0].arn
  guardrail_policy_arns = ["arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"]
  sns_topic_arns        = [for topic in aws_sns_topic.alerts : topic.arn]
}

# A service deployment that never got healthy and was rolled back (docs/OPERATIONS.md#deployment-failed).
resource "aws_cloudwatch_event_rule" "deployment_failed" {
  name        = "${var.name}-deployment-failed"
  description = "A deployment of ${var.cluster_name} failed and was rolled back. Runbook: docs/OPERATIONS.md#deployment-failed"
  event_pattern = jsonencode({
    source        = ["aws.ecs"]
    "detail-type" = ["ECS Deployment State Change"]
    resources     = [{ prefix = "arn:aws:ecs:${local.region}:${local.account_id}:service/${var.cluster_name}/" }]
    detail        = { eventName = ["SERVICE_DEPLOYMENT_FAILED"] }
  })
}

resource "aws_cloudwatch_event_target" "deployment_failed" {
  rule = aws_cloudwatch_event_rule.deployment_failed.name
  arn  = aws_sns_topic.alerts["warning"].arn
}

# The account's monthly bill (docs/OPERATIONS.md#budget-exceeded). AWS Budgets sees the whole
# account, so only one stage (production) sets it.
resource "aws_budgets_budget" "monthly" {
  count = var.monthly_budget != null ? 1 : 0

  name         = "${var.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_sns_topic_arns = [aws_sns_topic.alerts["warning"].arn]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.alerts["warning"].arn]
  }

  depends_on = [aws_sns_topic_policy.alerts]
}
