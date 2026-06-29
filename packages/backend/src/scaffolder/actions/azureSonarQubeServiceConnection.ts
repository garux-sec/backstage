import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Config } from '@backstage/config';

export function createAzureSonarQubeServiceConnectionAction(options: { config: Config }) {
  return createTemplateAction({
    id: 'azure:service-connection:sonarqube',
    description: 'Creates a SonarQube service connection in Azure DevOps and authorizes it for all pipelines.',
    schema: {
      input: (zImpl: any) => zImpl.object({
        organization: zImpl.string().describe('The Azure DevOps Organization'),
        project: zImpl.string().describe('The Azure DevOps Project Name'),
        connectionName: zImpl.string().optional().describe('Service connection name (default: SonarQubeServer)'),
        sonarQubeUrl: zImpl.string().optional().describe('SonarQube server URL (falls back to SONARQUBE_URL env var or sonarqube.baseUrl config)'),
        sonarQubeToken: zImpl.string().optional().describe('SonarQube token (falls back to SONARQUBE_TOKEN env var or sonarqube.apiKey config)'),
      }),
    },
    async handler(ctx) {
      const { organization, project } = ctx.input;
      const connectionName = ctx.input.connectionName || 'SonarQubeServer';
      const sonarQubeUrl = ctx.input.sonarQubeUrl || process.env.SONARQUBE_URL || options.config.getOptionalString('sonarqube.baseUrl');
      const sonarQubeToken = ctx.input.sonarQubeToken || process.env.SONARQUBE_TOKEN || options.config.getOptionalString('sonarqube.apiKey');

      if (!sonarQubeUrl || !sonarQubeToken) {
        ctx.logger.warn('SonarQube URL or Token not configured. Skipping SonarQube service connection setup.');
        return;
      }

      const token = process.env.AZURE_DEVOPS_TOKEN || options.config.getOptionalString('integrations.azure[0].credentials[0].personalAccessToken');
      if (!token) {
        throw new Error('Azure DevOps token is missing');
      }

      const orgUrl = `https://dev.azure.com/${organization}`;
      const authHeader = `Basic ${Buffer.from(`:${token}`).toString('base64')}`;
      const baseApiUrl = `${orgUrl}/${encodeURIComponent(project)}/_apis/serviceendpoint`;

      // 1. Check if service connection already exists
      ctx.logger.info(`Checking if SonarQube service connection "${connectionName}" exists in project ${project}...`);

      const listResponse = await fetch(`${baseApiUrl}/endpoints?type=sonarqube&api-version=7.1`, {
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      });

      if (listResponse.ok) {
        const listData: any = await listResponse.json();
        const existing = listData.value?.find(
          (ep: any) => ep.name?.toLowerCase() === connectionName.toLowerCase(),
        );
        if (existing) {
          ctx.logger.info(`SonarQube service connection "${connectionName}" already exists (ID: ${existing.id}). Skipping creation.`);
          await authorizeForAllPipelines(ctx, orgUrl, project, existing.id, authHeader, connectionName);
          return;
        }
      }

      // 2. Get project ID
      ctx.logger.info(`Fetching project ID for "${project}"...`);
      const projectResponse = await fetch(
        `${orgUrl}/_apis/projects/${encodeURIComponent(project)}?api-version=7.1`,
        { headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' } },
      );

      if (!projectResponse.ok) {
        throw new Error(`Failed to fetch project "${project}": ${projectResponse.status}`);
      }

      const projectData: any = await projectResponse.json();
      const projectId = projectData.id;

      // 3. Create SonarQube service connection
      ctx.logger.info(`Creating SonarQube service connection "${connectionName}"...`);

      const createBody = {
        name: connectionName,
        type: 'sonarqube',
        url: sonarQubeUrl,
        authorization: {
          parameters: {
            username: sonarQubeToken,
          },
          scheme: 'UsernamePassword',
        },
        isShared: false,
        isReady: true,
        serviceEndpointProjectReferences: [
          {
            projectReference: { id: projectId, name: project },
            name: connectionName,
          },
        ],
      };

      const createResponse = await fetch(`${baseApiUrl}/endpoints?api-version=7.1`, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(createBody),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create SonarQube service connection: ${createResponse.status} - ${errorText}`);
      }

      const created: any = await createResponse.json();
      ctx.logger.info(`SonarQube service connection "${connectionName}" created (ID: ${created.id}).`);

      // 4. Authorize for all pipelines
      await authorizeForAllPipelines(ctx, orgUrl, project, created.id, authHeader, connectionName);
    },
  });
}

async function authorizeForAllPipelines(
  ctx: any, orgUrl: string, project: string, endpointId: string, authHeader: string, connectionName: string,
) {
  ctx.logger.info(`Authorizing "${connectionName}" for all pipelines in "${project}"...`);
  try {
    const response = await fetch(
      `${orgUrl}/${encodeURIComponent(project)}/_apis/pipelines/pipelinepermissions/endpoint/${endpointId}?api-version=7.1-preview.1`,
      {
        method: 'PATCH',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allPipelines: { authorized: true, authorizedBy: null, authorizedOn: null },
          pipelines: null,
          resource: { id: endpointId, type: 'endpoint' },
        }),
      },
    );

    if (response.ok) {
      ctx.logger.info(`Pipeline access granted for all pipelines in "${project}".`);
    } else {
      const warnText = await response.text();
      ctx.logger.warn(`Could not auto-authorize pipelines: ${warnText}`);
    }
  } catch (err: any) {
    ctx.logger.warn(`Could not grant pipeline access: ${err.message}`);
  }
}
