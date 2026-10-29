# Origin lock (docs/CLOUDFLARE.md): the secret header Cloudflare adds to every request. It starts as
# "off" (nothing is checked). To turn it on, put the same value as the Cloudflare transform rule:
#   aws ssm put-parameter --overwrite --type SecureString --name /<project>/<stage>/origin-verify-header --value <value>
# and deploy. Terraform never overwrites the value you set.
resource "aws_ssm_parameter" "origin_verify" {
  name  = "/${local.project}/${local.stage}/origin-verify-header"
  type  = "SecureString"
  value = "off"

  lifecycle {
    ignore_changes = [value]
  }
}

locals {
  origin_verify_header = aws_ssm_parameter.origin_verify.value
  origin_lock          = nonsensitive(aws_ssm_parameter.origin_verify.value != "off")
}
