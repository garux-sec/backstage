output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "app_service_name" {
  value = azurerm_linux_web_app.main.name
}

output "app_service_url" {
  value = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "app_insights_connection_string" {
  value     = azurerm_application_insights.main.connection_string
  sensitive = true
}

output "app_insights_instrumentation_key" {
  value     = azurerm_application_insights.main.instrumentation_key
  sensitive = true
}

output "postgresql_fqdn" {
  value = var.include_database ? azurerm_postgresql_flexible_server.main[0].fqdn : ""
}

output "redis_hostname" {
  value = var.include_redis ? azurerm_redis_cache.main[0].hostname : ""
}
