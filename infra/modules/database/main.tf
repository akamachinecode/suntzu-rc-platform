# PostgreSQL on Amazon RDS, in the private subnets. Only members of the "client" security group
# (the API) can connect, always over TLS.
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    random = {
      source = "hashicorp/random"
    }
  }
}

# Attach this group to whatever needs the database.
resource "aws_security_group" "client" {
  name_prefix = "${var.name}-db-client-"
  description = "Members can connect to the database"
  vpc_id      = var.vpc_id

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "database" {
  name_prefix = "${var.name}-db-"
  description = "PostgreSQL from database clients only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from database clients"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.client.id]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_subnet_group" "database" {
  name_prefix = "${var.name}-"
  subnet_ids  = var.subnet_ids
}

# Letters and numbers only: it goes into a URL. It is kept in the encrypted, private state bucket.
resource "random_password" "database" {
  length  = 32
  special = false
}

resource "aws_db_instance" "database" {
  identifier_prefix          = "${substr(var.name, 0, 36)}-"
  engine                     = "postgres"
  engine_version             = var.engine_version
  auto_minor_version_upgrade = true
  instance_class             = "db.t4g.micro"
  allocated_storage          = 20
  max_allocated_storage      = 100
  storage_type               = "gp3"
  storage_encrypted          = true
  db_name                    = "app"
  username                   = "app"
  password                   = random_password.database.result
  db_subnet_group_name       = aws_db_subnet_group.database.name
  vpc_security_group_ids     = [aws_security_group.database.id]
  publicly_accessible        = false
  backup_retention_period    = 7
  copy_tags_to_snapshot      = true
  # Production can't be deleted by accident and leaves a final snapshot if it is deleted on purpose.
  deletion_protection       = var.protect
  skip_final_snapshot       = !var.protect
  final_snapshot_identifier = var.protect ? "${var.name}-final" : null
}

# The API gets DATABASE_URL from here when its container starts. TLS is verified against the RDS
# certificate bundle baked into the image (apps/api/Dockerfile).
resource "aws_ssm_parameter" "url" {
  name  = "${var.parameter_prefix}/database-url"
  type  = "SecureString"
  value = "postgres://${aws_db_instance.database.username}:${random_password.database.result}@${aws_db_instance.database.address}:${aws_db_instance.database.port}/${aws_db_instance.database.db_name}?sslmode=verify-full"
}
