# CloudWatch Transaction Search: where the app's and the API's traces are stored (docs/OPERATIONS.md#traces).
# Once per AWS account and region. X-Ray writes every span to the log group aws/spans (and keeps
# 1% indexed as trace summaries, free); this policy lets it write there.
data "aws_region" "current" {}

resource "aws_cloudwatch_log_resource_policy" "transaction_search" {
  policy_name = "TransactionSearchXRayAccess"
  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "TransactionSearchXRayAccess"
      Effect    = "Allow"
      Principal = { Service = "xray.amazonaws.com" }
      Action    = "logs:PutLogEvents"
      Resource = [
        "arn:aws:logs:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:log-group:aws/spans:*",
        "arn:aws:logs:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/application-signals/data:*",
      ]
      Condition = {
        ArnLike      = { "aws:SourceArn" = "arn:aws:xray:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:*" }
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
      }
    }]
  })
}

resource "aws_xray_trace_segment_destination" "transaction_search" {
  destination = "CloudWatchLogs"
  depends_on  = [aws_cloudwatch_log_resource_policy.transaction_search]
}
