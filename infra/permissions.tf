# What the API's code and its scheduled jobs may do in AWS, and nothing else: read and write the
# engine's snapshots, send email from verified identities, and call Claude on Bedrock.
data "aws_iam_policy_document" "code" {
  statement {
    sid       = "Snapshots"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${aws_s3_bucket.snapshots.arn}/*"]
  }

  # Lets a missing snapshot answer "not found" instead of "access denied".
  statement {
    sid       = "ListSnapshots"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.snapshots.arn]
  }

  statement {
    sid       = "Email"
    actions   = ["ses:SendEmail"]
    resources = ["arn:aws:ses:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:identity/*"]
  }

  # The engine calls Claude through Bedrock's Mantle endpoint (@anthropic-ai/bedrock-sdk), which is
  # authorised as bedrock-mantle:CreateInference on the account's Mantle projects.
  statement {
    sid       = "AiMantle"
    actions   = ["bedrock-mantle:CreateInference"]
    resources = ["arn:aws:bedrock-mantle:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:project/*"]
  }

  statement {
    sid       = "AiModels"
    actions   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "code" {
  name   = "${local.name}-code"
  policy = data.aws_iam_policy_document.code.json
}
