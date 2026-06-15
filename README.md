# MP-Backstage — Internal Developer Portal

Internal Developer Portal สำหรับ Mitrphol Group สร้างบน [Backstage by Spotify](https://backstage.io)

---

## Features

- **Microsoft Entra ID (Azure AD)** — Login + User/Group sync
- **Azure DevOps Plugin** — Pipelines, Git Tags, Pull Requests, README
- **APIM API Template** — Scaffolder template สำหรับ onboard API ใหม่เข้า Azure APIM พร้อม Terraform pipeline อัตโนมัติ
- **SonarQube** — Code quality integration
- **TechDocs** — Documentation site จาก Markdown
- **Tech Radar** — Technology radar สำหรับ internal standards
- **Custom Scaffolder Actions** — 8 Azure DevOps actions (project, pipeline, SSH connection, variable group, Key Vault, service connection)

---

## Prerequisites

| Tool | Version | หมายเหตุ |
|---|---|---|
| Node.js | 20.x | `nvm use 20` |
| Yarn | 1.x (classic) | `npm install -g yarn` |
| PostgreSQL | 14+ | สำหรับ production |
| Python | 3.x | สำหรับ TechDocs |
| mkdocs-techdocs-core | latest | `pip install mkdocs-techdocs-core` |

---

## Quick Start

### 1. Clone

```bash
git clone git@github.com:garux-sec/backstage.git
cd backstage
```

### 2. ใช้ Node.js v20

```bash
nvm install 20
nvm use 20
node -v  # ต้องขึ้น v20.x.x
```

> ⚠️ **สำคัญ**: ต้องใช้ Node v20 เท่านั้น — v18 หรือ v22 จะ error

### 3. สร้าง .env

```bash
cp .env.example .env
```

แก้ค่าใน `.env` ให้ครบ (ดูหัวข้อ [Environment Variables](#environment-variables))

> `.env` ถูก gitignore แล้ว ห้าม commit ขึ้น git

### 4. Setup & Install

```bash
chmod +x setup.sh
./setup.sh
```

script จะตรวจ Node version, ติดตั้ง dependencies ด้วย `yarn install` และแจ้งเตือนถ้ามีอะไรขาด

### 5. รัน PostgreSQL (ถ้ายังไม่มี DB)

```bash
docker compose up -d
```

### 6. รัน Backstage

```bash
yarn start
```

เปิด browser ที่ `http://localhost:3000`

---

## Environment Variables

| Variable | Required | คำอธิบาย |
|---|---|---|
| `POSTGRES_HOST` | ✅ | PostgreSQL host |
| `POSTGRES_PORT` | ✅ | PostgreSQL port (default: 5432) |
| `POSTGRES_USER` | ✅ | PostgreSQL username |
| `POSTGRES_PASSWORD` | ✅ | PostgreSQL password |
| `AUTH_MICROSOFT_CLIENT_ID` | ✅ | App Registration Client ID |
| `AUTH_MICROSOFT_TENANT_ID` | ✅ | Azure AD Tenant ID |
| `AUTH_MICROSOFT_CLIENT_SECRET` | ✅ | App Registration Client Secret |
| `AZURE_DEVOPS_TOKEN` | ✅ | Azure DevOps PAT token |
| `AZURE_DEVOPS_ORG` | ✅ | Azure DevOps Organization name |
| `SONARQUBE_URL` | ⬜ | SonarQube base URL |
| `SONARQUBE_TOKEN` | ⬜ | SonarQube API token |

---

## Azure AD App Registration Setup

1. ไปที่ **Azure Portal → App registrations → New registration**
2. Redirect URI: `http://localhost:7007/api/auth/microsoft/handler/frame`
3. API permissions: `User.Read`, `GroupMember.Read.All`, `email`, `openid`, `profile`
4. สร้าง Client Secret แล้วใส่ใน `.env`

---

## Azure DevOps PAT Token — Required Scopes

| Scope | Permission |
|---|---|
| Code | Read & Write |
| Build | Read & Execute |
| Project and Team | Read, Write & Manage |
| Service Connections | Read, Query & Manage |
| Agent Pools | Read & Manage |
| Variable Groups | Read, Create & Manage |

---

## APIM API Template — วิธีใช้

Template นี้สร้าง API ใหม่ใน Azure APIM แบบ end-to-end อัตโนมัติ

**ไปที่ Create → Publish API Spec to Azure APIM**

กรอก 8 ขั้นตอน:
1. ข้อมูล Backend (Master)
2. ข้อมูลผู้ติดต่อ
3. API Information (ชื่อ, version, base path)
4. Azure DevOps Repository (org, project)
5. Azure APIM Target (instance name, resource group, service connection, agent pool)
6. Infrastructure & Observability (Terraform state storage, optional Log Analytics, optional App Registration)
7. OpenAPI Spec (YAML/JSON)
8. APIM Policy (XML)

ระบบจะทำอัตโนมัติ:
- สร้าง repo ใน Azure DevOps
- สร้าง 6-stage CI/CD pipeline
- Deploy API เข้า APIM ผ่าน Terraform
- Register entity ใน Backstage catalog

### Prerequisites สำหรับ APIM Template

- Azure APIM instance
- Azure Blob Storage สำหรับ Terraform state (container: `tfstate`)
- Service Connection ใน Azure DevOps ที่ใช้ Workload Identity Federation (OIDC)
- Service Principal มี role **Storage Blob Data Contributor** บน Storage Account

---

## Docker

```bash
docker compose up -d
```

---

## Project Structure

```
packages/
  app/src/
    App.tsx                     # Plugin registration (frontend)
    modules/                    # Auth, Nav, SonarQube, TechRadar
  backend/src/
    index.ts                    # Backend entrypoint
    scaffolder/actions/         # 8 custom Azure DevOps actions
catalog/
  templates/apim-api-template/
    template.yaml               # 8-step wizard definition
    skeleton/
      catalog-info.yaml         # Entity registration
      azure-pipelines.yml       # 6-stage Terraform pipeline
      iac/                      # Terraform (backend, main, monitoring, variables)
  users/all-users.yaml
app-config.yaml                 # Base config
app-config.dev.yaml             # Dev overrides
```

---

## Custom Scaffolder Actions

| Action ID | ไฟล์ | ทำอะไร |
|---|---|---|
| `azure:project:ensure-exists` | `azureProjectEnsureExists.ts` | สร้าง/ตรวจสอบ Azure DevOps Project |
| `azure:pipeline:ensure` | `azurePipelineEnsure.ts` | สร้าง pipeline จาก YAML |
| `azure:pipeline:queue-run` | `azurePipelineRun.ts` | Trigger + poll pipeline จน complete |
| `azure:pipeline:authorize-pool` | `azurePipelineAuthorizePool.ts` | Authorize agent pool |
| `azure:service-connection:authorize` | `azureServiceConnectionAuthorize.ts` | ตั้งสิทธิ์ service connection |
| `azure:ssh-service-connection:create` | `azureSshServiceConnectionCreate.ts` | สร้าง SSH service connection |
| `azure:variable-group:ensure` | `azureVariableGroupEnsure.ts` | สร้าง/อัปเดต variable group |
| `azure:keyvault:set-secret` | `azureKeyVaultSetSecret.ts` | เขียน secret ลง Key Vault |

---

## Troubleshooting

**Pipelines/Git Tags/Pull Requests แสดง 500 Error**
- ตรวจสอบ `AZURE_DEVOPS_ORG` ใน `.env`
- ตรวจสอบ annotation `dev.azure.com/host-org: "dev.azure.com/<org>"` ใน catalog-info.yaml

**catalog:register ไม่สำเร็จ**
- entity จะถูก refresh อัตโนมัติทุก ~1 นาที ไม่ต้อง action เพิ่ม

**Terraform Apply ล้มเหลว — Storage auth**
- ตรวจสอบว่า Service Principal มี role **Storage Blob Data Contributor** บน Storage Account
- ตรวจสอบ `use_azuread_auth = true` ใน `iac/backend.tf`

---

## License

Internal use only — Mitrphol Group
