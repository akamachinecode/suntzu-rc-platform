# Tracing (docs/OPERATIONS.md#traces): an OpenTelemetry Collector runs next to the service, in the
# same task. The code sends its spans to it on localhost:4318; the Collector removes personal data
# and query strings, and forwards them, signed with the task role (no keys), to CloudWatch
# Transaction Search. Optionally it also sends a copy to another OTLP backend.
data "aws_partition" "current" {}

locals {
  telemetry = var.telemetry != null

  # Extra variables for the service's container.
  telemetry_environment = local.telemetry ? {
    OTEL_SDK_DISABLED           = "false"
    OTEL_SERVICE_NAME           = var.service
    OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318"
    OTEL_TRACES_SAMPLER_ARG     = tostring(var.telemetry.sample_ratio)
    OTEL_RESOURCE_ATTRIBUTES    = "deployment.environment.name=${var.telemetry.environment}"
  } : {}

  remote = try(var.telemetry.remote, null)

  collector_config = {
    extensions = {
      sigv4auth = { region = data.aws_region.current.region, service = "xray" }
    }
    receivers = {
      # Only reachable from inside the task.
      otlp = { protocols = { http = { endpoint = "127.0.0.1:4318" } } }
    }
    processors = {
      memory_limiter     = { check_interval = "1s", limit_mib = 100, spike_limit_mib = 25 }
      resource_detection = { detectors = ["ecs"], timeout = "2s", override = false }
      # Query strings can carry tokens (sign-in links, password resets): dropped everywhere. So is
      # the visitor's IP address, which is personal data.
      transform = {
        error_mode = "ignore"
        trace_statements = [
          "replace_pattern(span.name, \"\\\\?.*\", \"\")",
          "replace_pattern(span.attributes[\"url.full\"], \"\\\\?.*\", \"\")",
          "replace_pattern(span.attributes[\"http.url\"], \"\\\\?.*\", \"\")",
          "replace_pattern(span.attributes[\"http.target\"], \"\\\\?.*\", \"\")",
          "delete_key(span.attributes, \"url.query\")",
          "delete_key(span.attributes, \"client.address\")",
        ]
      }
      # Second line of defense: any value that looks like an email address or a token is masked.
      redaction = {
        allow_all_keys = true
        blocked_values = [
          "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}",
          "eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+",
          "(?i)bearer\\s+[A-Za-z0-9._~+/=-]+",
        ]
        summary = "silent"
      }
      batch = {}
    }
    exporters = merge(
      {
        "otlp_http/aws" = {
          traces_endpoint = "https://xray.${data.aws_region.current.region}.amazonaws.com/v1/traces"
          auth            = { authenticator = "sigv4auth" }
        }
      },
      local.remote == null ? {} : {
        "otlp_http/remote" = {
          endpoint = local.remote.endpoint
          headers  = { authorization = "$${env:REMOTE_OTLP_AUTHORIZATION}" }
        }
      },
    )
    service = {
      extensions = ["sigv4auth"]
      telemetry  = { logs = { level = "warn" } }
      pipelines = {
        traces = {
          receivers  = ["otlp"]
          processors = ["memory_limiter", "resource_detection", "transform", "redaction", "batch"]
          exporters  = local.remote == null ? ["otlp_http/aws"] : ["otlp_http/aws", "otlp_http/remote"]
        }
      }
    }
  }

  collector = merge({
    name      = "otel"
    image     = try(var.telemetry.collector_image, "")
    essential = false
    command   = ["--config=env:OTEL_COLLECTOR_CONFIG"]
    environment = [
      { name = "OTEL_COLLECTOR_CONFIG", value = yamlencode(local.collector_config) },
    ]
    readonlyRootFilesystem = true
    # If it stops, ECS starts it again; the service keeps running meanwhile.
    restartPolicy = { enabled = true, restartAttemptPeriod = 60 }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.service.name
        awslogs-region        = data.aws_region.current.region
        awslogs-stream-prefix = "otel"
      }
    }
    }, local.remote == null ? {} : {
    secrets = [{ name = "REMOTE_OTLP_AUTHORIZATION", valueFrom = local.remote_arn }]
  })

  remote_arn = local.remote == null ? "" : (
    startswith(local.remote.authorization_parameter, "arn:") ? local.remote.authorization_parameter : "arn:${data.aws_partition.current.partition}:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter${local.remote.authorization_parameter}"
  )
}

# The Collector signs its requests with the task role.
data "aws_iam_policy_document" "traces" {
  statement {
    actions   = ["xray:PutTraceSegments", "xray:PutSpans", "xray:PutSpansForIndexing"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "traces" {
  count = local.telemetry ? 1 : 0

  name   = "send-traces"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.traces.json
}

# The remote backend's key (an SSM SecureString parameter) is read when the task starts.
data "aws_iam_policy_document" "remote" {
  count = local.remote == null ? 0 : 1

  statement {
    actions   = ["ssm:GetParameters"]
    resources = [local.remote_arn]
  }
}

resource "aws_iam_role_policy" "remote" {
  count = local.remote == null ? 0 : 1

  name   = "read-remote-otlp-key"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.remote[0].json
}
