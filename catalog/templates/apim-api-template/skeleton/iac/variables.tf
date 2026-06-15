# =============================================================================
# Variables — ค่าทั้งหมดถูก inject จาก terraform.tfvars
#             ซึ่ง Backstage Scaffolder สร้างให้อัตโนมัติตอน onboard
# =============================================================================

# ---------------------------------------------------------------------------
# Azure Infrastructure
# ---------------------------------------------------------------------------

variable "resource_group_name" {
  type        = string
  description = "Azure Resource Group ที่มี APIM instance อยู่"
}

variable "apim_instance_name" {
  type        = string
  description = "ชื่อ Azure APIM instance"
}

# ---------------------------------------------------------------------------
# API Configuration
# ---------------------------------------------------------------------------

variable "api_name" {
  type        = string
  description = "Unique API identifier (kebab-case) — ใช้เป็น APIM API ID และ resource name"
}

variable "api_display_name" {
  type        = string
  description = "Human-readable API name แสดงใน APIM portal"
}

variable "api_version" {
  type        = string
  description = "API version label (เช่น v1)"
}

variable "api_path" {
  type        = string
  description = "URL path prefix ใน APIM gateway"
}

variable "backend_url" {
  type        = string
  description = "URL ของ backend service จริง"
}

# ---------------------------------------------------------------------------
# Product Tier (ADR-012)
# ---------------------------------------------------------------------------

variable "product_tier" {
  type        = string
  description = "APIM Product tier: bronze | silver | gold (ADR-012 Tiered Rate Limit) — ว่างได้ถ้าไม่ต้องการ assign product"
  default     = "silver"

  validation {
    condition     = contains(["", "bronze", "silver", "gold"], var.product_tier)
    error_message = "product_tier ต้องเป็น bronze, silver, gold หรือค่าว่าง เท่านั้น"
  }
}

# ---------------------------------------------------------------------------
# Identity & JWT Validation
# ---------------------------------------------------------------------------

variable "tenant_id" {
  type        = string
  description = "Microsoft Entra ID tenant ID สำหรับ JWT issuer validation"
}

variable "app_id" {
  type        = string
  description = "Entra ID App Registration client ID (JWT audience claim)"
}

# ---------------------------------------------------------------------------
# Observability (ADR-013)
# ---------------------------------------------------------------------------

variable "log_analytics_workspace_id" {
  type        = string
  description = "Resource ID ของ Log Analytics workspace — รับ GatewayLogs และ metrics"
}

# ---------------------------------------------------------------------------
# Alert Action Groups (3-Tier Triage per ADR-013)
# ค่าว่าง = alert ถูกสร้างแต่ไม่ส่ง notification
# ---------------------------------------------------------------------------

variable "backend_dev_action_group_id" {
  type        = string
  description = "Action Group ID สำหรับ Backend Dev team (Tier 3: 5xx errors)"
  default     = ""
}

variable "iam_action_group_id" {
  type        = string
  description = "Action Group ID สำหรับ IAM team (Tier 1: 401/403 auth failures)"
  default     = ""
}

variable "platform_action_group_id" {
  type        = string
  description = "Action Group ID สำหรับ Platform/APIM team (Tier 2: 429/503 rate limit)"
  default     = ""
}
