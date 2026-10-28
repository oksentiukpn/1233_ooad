terraform {
  required_version = ">= 1.5.0"

  cloud {
    organization = "1233_my_app"
    workspaces {
      name = "1233_ooad"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "Spry"
      Environment = "Production-Minimal"
      ManagedBy   = "Terraform"
    }
  }
}
