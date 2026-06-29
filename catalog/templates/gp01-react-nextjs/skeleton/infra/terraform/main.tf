terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.90.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstate${var.project_name}"
    container_name       = "tfstate"
    key                  = "${var.project_name}.${var.environment}.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    project     = var.project_name
    environment = var.environment
    golden_path = "gp01-react-nextjs"
    managed_by  = "terraform"
    owner       = var.owner_team
  }
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${local.resource_prefix}-rg"
  location = var.location
  tags     = local.common_tags
}

# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "${local.resource_prefix}-plan"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = var.app_service_sku
  tags                = local.common_tags
}

# App Service (Next.js)
resource "azurerm_linux_web_app" "main" {
  name                = "${local.resource_prefix}-app"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id
  https_only          = true
  tags                = local.common_tags

  site_config {
    application_stack {
      node_version = "20-lts"
    }
    always_on        = var.environment == "prod"
    ftps_state       = "Disabled"
    health_check_path = "/api/health"
  }

  app_settings = merge(
    {
      "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
      "APPLICATIONINSIGHTS_CONNECTION_STRING" = azurerm_application_insights.main.connection_string
      "NODE_ENV"                              = var.environment == "prod" ? "production" : "development"
    },
    var.include_database ? {
      "DATABASE_URL" = "postgresql://${azurerm_postgresql_flexible_server.main[0].administrator_login}:${var.db_password}@${azurerm_postgresql_flexible_server.main[0].fqdn}:5432/${var.project_name}?sslmode=require"
    } : {},
    var.include_redis ? {
      "REDIS_URL" = "rediss://:${azurerm_redis_cache.main[0].primary_access_key}@${azurerm_redis_cache.main[0].hostname}:${azurerm_redis_cache.main[0].ssl_port}"
    } : {}
  )

  identity {
    type = "SystemAssigned"
  }
}

# Application Insights
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.resource_prefix}-law"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.common_tags
}

resource "azurerm_application_insights" "main" {
  name                = "${local.resource_prefix}-ai"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "Node.JS"
  tags                = local.common_tags
}

# PostgreSQL Flexible Server (conditional)
resource "azurerm_postgresql_flexible_server" "main" {
  count               = var.include_database ? 1 : 0
  name                = "${local.resource_prefix}-psql"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  version             = "16"
  administrator_login = "${replace(var.project_name, "-", "")}admin"
  administrator_password = var.db_password
  storage_mb          = var.db_storage_mb
  sku_name            = var.db_sku
  zone                = "1"
  tags                = local.common_tags

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = true
  }
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  count     = var.include_database ? 1 : 0
  name      = var.project_name
  server_id = azurerm_postgresql_flexible_server.main[0].id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  count            = var.include_database ? 1 : 0
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main[0].id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Redis Cache (conditional)
resource "azurerm_redis_cache" "main" {
  count               = var.include_redis ? 1 : 0
  name                = "${local.resource_prefix}-redis"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku
  minimum_tls_version = "1.2"
  tags                = local.common_tags

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }
}
