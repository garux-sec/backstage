# ${{ values.name }}

${{ values.description }}

## 🏗️ Architecture

**Golden Path:** GP#01 - React/Next.js + Node.js  
**TGB Status:** ADOPT ring (all components evaluated 2026-05-07)

### Stack
- **Frontend:** React 18.x LTS + Next.js 16.x (App Router) + TypeScript 5.x
{%- if values.bffPattern === 'nextjs-api-routes' %}
- **Backend:** Next.js API Routes (lightweight BFF)
{%- else %}
- **Backend:** NestJS 11.x (structured backend)
{%- endif %}
{%- if values.includeDatabase %}
- **Database:** PostgreSQL 16.x LTS (Azure PostgreSQL Flexible Server)
{%- endif %}
{%- if values.includeRedis %}
- **Caching:** Redis (Azure Cache for Redis)
{%- endif %}
{%- if values.includeAuth %}
- **Authentication:** Azure AD / Entra ID (OAuth2/OIDC)
{%- endif %}
- **Deployment:** ${{ values.deploymentTarget }}

### TGB Scores
- React 18.x: **87.75/100** (ADOPT)
- Next.js 16.x: **82.5/100** (ADOPT)
- TypeScript 5.x: **91.25/100** (ADOPT, MANDATORY)
{%- if values.includeDatabase %}
- PostgreSQL 16.x: **95.0/100** (ADOPT)
{%- endif %}

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x LTS
- npm 10.x or yarn 4.x
{%- if values.includeDatabase %}
- PostgreSQL 16.x (local or Azure)
{%- endif %}
{%- if values.includeRedis %}
- Redis 7.x (local or Azure Cache)
{%- endif %}

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

{%- if values.includeDatabase %}
# Run database migrations
npx prisma migrate dev
{%- endif %}

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
${{ values.name }}/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities, API clients
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript types
├── public/               # Static assets
├── tests/
│   ├── unit/             # Vitest unit tests
│   └── e2e/              # Playwright E2E tests
{%- if values.includeDatabase %}
├── prisma/
│   └── schema.prisma     # Database schema
{%- endif %}
├── .env.local            # Environment variables (not committed)
├── next.config.js        # Next.js configuration
├── tsconfig.json         # TypeScript configuration (strict mode)
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

{%- if values.enableE2E %}
### E2E Tests (Playwright)
```bash
npm run test:e2e
```
{%- endif %}

### Type Checking
```bash
npm run type-check
```

## 🚢 Deployment

{%- if values.cicd === 'github-actions' %}
### GitHub Actions (Automated)
Push to `main` branch triggers automatic deployment to Azure.

See `.github/workflows/deploy.yml` for configuration.
{%- else %}
### Azure DevOps (Automated)
Push to `main` branch triggers Azure Pipelines deployment.

See `azure-pipelines.yml` for configuration.
{%- endif %}

### Manual Deployment
```bash
# Build production bundle
npm run build

# Start production server
npm start
```

## 📚 Documentation

- **Golden Path Guide:** [GP#01 Documentation](https://git.company.com/ea/tech_stack/golden-paths/gp01-react-nextjs-nodejs.md)
- **TGB Scorecards:** [Evaluation Scorecards](https://git.company.com/ea/tech_stack/tgb-evaluation-scorecards-v2.md)
- **Next.js Docs:** [https://nextjs.org/docs](https://nextjs.org/docs)
- **React Docs:** [https://react.dev](https://react.dev)
- **TypeScript Docs:** [https://www.typescriptlang.org/docs/](https://www.typescriptlang.org/docs/)

## 🛟 Support

- **Platform Engineering Team:** platform@company.com
- **Slack:** #golden-paths
- **Internal Wiki:** [GP#01 Knowledge Base](https://wiki.company.com/gp01)

## 📝 Best Practices (GP#01)

✅ **TypeScript strict mode** (MANDATORY - no `any` types)  
✅ **Server Components by default** (Next.js App Router)  
✅ **TanStack Query for server state**  
✅ **80%+ test coverage** (TGB requirement)  
✅ **Azure AD authentication** (OAuth2/OIDC)  
✅ **Image optimization** (Next.js Image component)  

❌ **Don't use Next.js API Routes for heavy backend logic** (use NestJS or GP#03)  
❌ **Don't duplicate server state in client state**  
❌ **Don't disable TypeScript strict mode**  

## 📊 Monitoring

{%- if values.deploymentTarget === 'azure-app-service' or values.deploymentTarget === 'azure-container-apps' %}
- **Azure Application Insights:** [View Dashboard](https://portal.azure.com)
- **Metrics:** [Prometheus Metrics](https://portal.azure.com)
{%- endif %}

---

**Created with Backstage Software Templates**  
**Golden Path:** GP#01 (React/Next.js + Node.js)  
**Owner:** ${{ values.owner }}  
**Version:** 1.0.0
