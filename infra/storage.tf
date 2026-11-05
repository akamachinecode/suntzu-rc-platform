# Raw pages and feeds the events engine reads (it re-reads them when a source says "not modified").
# Private, encrypted by S3 by default. Production's bucket is never emptied by Terraform.
resource "aws_s3_bucket" "snapshots" {
  bucket_prefix = "${local.name}-snapshots-"
  force_destroy = !local.is_production
}

resource "aws_s3_bucket_public_access_block" "snapshots" {
  bucket                  = aws_s3_bucket.snapshots.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
