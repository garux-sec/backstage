import React from 'react';
import {
  TechRadarComponent,
  TechRadarLoaderResponse,
  RadarRing,
  RadarQuadrant,
  RadarEntry,
} from '@backstage-community/plugin-tech-radar';
import { Content, Header, Page } from '@backstage/core-components';

const rings: RadarRing[] = [
  { id: 'adopt', name: 'ADOPT', color: '#93c47d' },
  { id: 'trial', name: 'TRIAL', color: '#93d2c2' },
  { id: 'assess', name: 'ASSESS', color: '#fbdb84' },
  { id: 'hold', name: 'HOLD', color: '#efafa9' },
];

const quadrants: RadarQuadrant[] = [
  { id: 'languages', name: 'Languages' },
  { id: 'frameworks', name: 'Frameworks & Libraries' },
  { id: 'platforms', name: 'Platforms & Infrastructure' },
  { id: 'tools', name: 'Tools & Practices' },
];

const entries: RadarEntry[] = [
  // Languages
  { id: 'typescript', quadrant: 'languages', title: 'TypeScript', ring: 'adopt', moved: 0 },
  { id: 'python', quadrant: 'languages', title: 'Python', ring: 'adopt', moved: 0 },
  { id: 'javascript', quadrant: 'languages', title: 'JavaScript', ring: 'adopt', moved: 0 },
  { id: 'csharp', quadrant: 'languages', title: 'C#', ring: 'adopt', moved: 0 },
  { id: 'java', quadrant: 'languages', title: 'Java', ring: 'trial', moved: 0 },
  { id: 'golang', quadrant: 'languages', title: 'Go', ring: 'assess', moved: 0 },
  { id: 'powershell', quadrant: 'languages', title: 'PowerShell', ring: 'adopt', moved: 0 },
  { id: 'bash', quadrant: 'languages', title: 'Bash / Shell', ring: 'adopt', moved: 0 },

  // Frameworks & Libraries
  { id: 'react', quadrant: 'frameworks', title: 'React', ring: 'adopt', moved: 0 },
  { id: 'nextjs', quadrant: 'frameworks', title: 'Next.js', ring: 'adopt', moved: 0 },
  { id: 'nodejs', quadrant: 'frameworks', title: 'Node.js', ring: 'adopt', moved: 0 },
  { id: 'dotnet', quadrant: 'frameworks', title: '.NET / ASP.NET Core', ring: 'adopt', moved: 0 },
  { id: 'fastapi', quadrant: 'frameworks', title: 'FastAPI', ring: 'trial', moved: 1 },
  { id: 'nestjs', quadrant: 'frameworks', title: 'NestJS', ring: 'trial', moved: 0 },
  { id: 'backstage', quadrant: 'frameworks', title: 'Backstage (IDP)', ring: 'adopt', moved: 1 },
  { id: 'angular', quadrant: 'frameworks', title: 'Angular', ring: 'hold', moved: 0 },

  // Platforms & Infrastructure
  { id: 'azure', quadrant: 'platforms', title: 'Microsoft Azure', ring: 'adopt', moved: 0 },
  { id: 'azure-devops', quadrant: 'platforms', title: 'Azure DevOps', ring: 'adopt', moved: 0 },
  { id: 'docker', quadrant: 'platforms', title: 'Docker', ring: 'adopt', moved: 0 },
  { id: 'kubernetes', quadrant: 'platforms', title: 'Kubernetes (AKS)', ring: 'trial', moved: 1 },
  { id: 'postgresql', quadrant: 'platforms', title: 'PostgreSQL', ring: 'adopt', moved: 0 },
  { id: 'entra-id', quadrant: 'platforms', title: 'Microsoft Entra ID', ring: 'adopt', moved: 0 },
  { id: 'azure-keyvault', quadrant: 'platforms', title: 'Azure Key Vault', ring: 'adopt', moved: 0 },
  { id: 'sonarqube', quadrant: 'platforms', title: 'SonarQube', ring: 'trial', moved: 1 },
  { id: 'mssql', quadrant: 'platforms', title: 'SQL Server (MSSQL)', ring: 'adopt', moved: 0 },
  { id: 'redis', quadrant: 'platforms', title: 'Redis', ring: 'assess', moved: 0 },

  // Tools & Practices
  { id: 'git', quadrant: 'tools', title: 'Git', ring: 'adopt', moved: 0 },
  { id: 'ci-cd', quadrant: 'tools', title: 'CI/CD (Azure Pipelines)', ring: 'adopt', moved: 0 },
  { id: 'terraform', quadrant: 'tools', title: 'Terraform', ring: 'assess', moved: 1 },
  { id: 'ansible', quadrant: 'tools', title: 'Ansible', ring: 'trial', moved: 0 },
  { id: 'mkdocs', quadrant: 'tools', title: 'MkDocs (TechDocs)', ring: 'adopt', moved: 1 },
  { id: 'openapi', quadrant: 'tools', title: 'OpenAPI / Swagger', ring: 'adopt', moved: 0 },
  { id: 'github-actions', quadrant: 'tools', title: 'GitHub Actions', ring: 'assess', moved: 0 },
  { id: 'jest', quadrant: 'tools', title: 'Jest', ring: 'adopt', moved: 0 },
  { id: 'eslint', quadrant: 'tools', title: 'ESLint', ring: 'adopt', moved: 0 },
];

const techRadarData: TechRadarLoaderResponse = { rings, quadrants, entries };

export const MitrpholTechRadarPage = () => (
  <Page themeId="tool">
    <Header title="Tech Radar" subtitle="Technology landscape ของ Mitrphol Group" />
    <Content>
      <TechRadarComponent
        width={1500}
        height={800}
        getData={async () => techRadarData}
      />
    </Content>
  </Page>
);
