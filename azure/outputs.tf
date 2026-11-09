output "resource_group_name" {
  description = "Name of the Azure Resource Group"
  value       = azurerm_resource_group.main.name
}

output "azure_region" {
  description = "Region where resources are deployed"
  value       = azurerm_resource_group.main.location
}

output "key_vault_name" {
  description = "Name of the created Azure Key Vault"
  value       = azurerm_key_vault.main.name
}

output "database_fqdn" {
  description = "PostgreSQL Flexible Server FQDN"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "database_name" {
  description = "PostgreSQL database name"
  value       = azurerm_postgresql_flexible_server_database.main.name
}

output "database_admin_username" {
  description = "PostgreSQL admin username"
  value       = var.db_username
}

output "api_url" {
  description = "Public URL of Spry API running on Azure Container Apps"
  value       = "https://${azurerm_container_app.backend.latest_revision_fqdn}"
}

output "api_fqdn" {
  description = "Default ingress FQDN for the container app"
  value       = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
}
