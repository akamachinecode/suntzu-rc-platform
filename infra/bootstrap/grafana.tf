# Grafana Cloud reads this account's CloudWatch (docs/specs/0009-grafana-dashboard.md): metrics,
# alarms, the project's logs and its traces, when someone opens a dashboard. No keys: Grafana's own
# AWS account assumes this role, and only with our stack's external ID, so no other Grafana
# customer can use it. Read-only: it can't change or delete anything. Set grafana_external_id to ""
# to remove it.
locals {
  grafana     = var.grafana_external_id != "" ? { on = true } : {}
  logs_prefix = "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:"
}

data "aws_iam_policy_document" "grafana_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.grafana_account_id}:root"]
    }

    condition {
      test     = "StringEquals"
      variable = "sts:ExternalId"
      values   = [var.grafana_external_id]
    }
  }
}

# What Grafana's CloudWatch and Application Signals data sources call, and nothing else.
data "aws_iam_policy_document" "grafana" {
  statement {
    sid = "MetricsAndAlarms"
    actions = [
      "cloudwatch:DescribeAlarms",
      "cloudwatch:DescribeAlarmHistory",
      "cloudwatch:DescribeAlarmsForMetric",
      "cloudwatch:GetMetricData",
      "cloudwatch:GetInsightRuleReport",
      "cloudwatch:ListMetrics",
    ]
    resources = ["*"]
  }

  # Only the project's log groups: the services and jobs, the traces and Application Signals.
  statement {
    sid = "ProjectLogs"
    actions = [
      "logs:StartQuery",
      "logs:GetLogGroupFields",
      "logs:GetLogEvents",
      "logs:FilterLogEvents",
    ]
    resources = [
      "${local.logs_prefix}/ecs/rc-landing-*",
      "${local.logs_prefix}aws/spans",
      "${local.logs_prefix}aws/spans:*",
      "${local.logs_prefix}/aws/application-signals/data",
      "${local.logs_prefix}/aws/application-signals/data:*",
    ]
  }

  # These have no resource to scope to: listing groups, and following or stopping a query already
  # started on the groups above.
  statement {
    sid = "LogQueries"
    actions = [
      "logs:DescribeLogGroups",
      "logs:GetQueryResults",
      "logs:StopQuery",
    ]
    resources = ["*"]
  }

  # Traces (Application Signals data source, formerly X-Ray).
  statement {
    sid = "Traces"
    actions = [
      "xray:BatchGetTraces",
      "xray:GetTraceSummaries",
      "xray:GetTraceGraph",
      "xray:GetServiceGraph",
      "xray:GetGroups",
      "xray:GetTimeSeriesServiceStatistics",
      "xray:GetInsightSummaries",
      "xray:GetInsight",
      "xray:ListResourcePolicies",
      "application-signals:ListServices",
      "application-signals:GetService",
      "application-signals:ListServiceOperations",
      "application-signals:ListServiceDependencies",
      "application-signals:ListServiceDependents",
    ]
    resources = ["*"]
  }

  # Grafana fills its Region, dimension and tag pickers with these; cross-account observability
  # (oam) is only listed, never used.
  statement {
    sid = "Pickers"
    actions = [
      "ec2:DescribeRegions",
      "ec2:DescribeTags",
      "ec2:DescribeInstances",
      "tag:GetResources",
      "oam:ListSinks",
      "oam:ListAttachedLinks",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role" "grafana" {
  for_each = local.grafana

  name               = "${local.project}-grafana-read-only"
  description        = "Grafana Cloud reads CloudWatch (docs/specs/0009-grafana-dashboard.md). Read-only."
  assume_role_policy = data.aws_iam_policy_document.grafana_trust.json
}

resource "aws_iam_role_policy" "grafana" {
  for_each = local.grafana

  name   = "read-cloudwatch"
  role   = aws_iam_role.grafana[each.key].id
  policy = data.aws_iam_policy_document.grafana.json
}
