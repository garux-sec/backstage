import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Config } from '@backstage/config';

export function createAzureServiceConnectionAuthorizeAction(options: { config: Config }) {
  return createTemplateAction({
    id: 'azure:service-connection:authorize',
    description: 'Shares an existing Service Connection from a source project to a target project.',
    schema: {
      input: (zImpl: any) => zImpl.object({
        organization: zImpl.string().describe('The Azure DevOps Organization'),
        sourceProject: zImpl.string().describe('The project where the Service Connection was created'),
        targetProject: zImpl.string().describe('The project to share the Service Connection with'),
        connectionName: zImpl.string().describe('Name of the Service Connection to share'),
      }),
    },
    async handler(ctx) {
      const { organization, sourceProject, targetProject, connectionName } = ctx.input;

      const token = process.env.AZURE_DEVOPS_TOKEN || options.config.getOptionalString('integrations.azure[0].credentials[0].personalAccessToken');
      if (!token) {
        throw new Error('Azure DevOps token is missing');
      }

      const orgUrl = `https://dev.azure.com/${organization}`;
      const authHeader = `Basic ${Buffer.from(`:${token}`).toString('base64')}`;

      // 1. Get target project ID
      ctx.logger.info(`Fetching project ID for "${targetProject}"...`);
      const projectResponse = await fetch(
        `${orgUrl}/_apis/projects/${encodeURIComponent(targetProject)}?api-version=7.1`,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!projectResponse.ok) {
        throw new Error(`Failed to fetch project "${targetProject}": ${projectResponse.status} ${projectResponse.statusText}`);
      }

      const projectData: any = await projectResponse.json();
      const targetProjectId = projectData.id;
      ctx.logger.info(`Target project ID: ${targetProjectId}`);

      // 2. Find the Service Connection in the source project
      ctx.logger.info(`Looking up Service Connection "${connectionName}" in project "${sourceProject}"...`);
      const listResponse = await fetch(
        `${orgUrl}/${encodeURIComponent(sourceProject)}/_apis/serviceendpoint/endpoints?endpointNames=${encodeURIComponent(connectionName)}&api-version=7.1`,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!listResponse.ok) {
        throw new Error(`Failed to list service connections in "${sourceProject}": ${listResponse.status} ${listResponse.statusText}`);
      }

      const listData: any = await listResponse.json();
      const endpoint = listData.value?.find(
        (ep: any) => ep.name?.toLowerCase() === connectionName.toLowerCase(),
      );

      if (!endpoint) {
        ctx.logger.warn(`Service Connection "${connectionName}" not found in project "${sourceProject}". Skipping.`);
        return;
      }

      ctx.logger.info(`Found Service Connection "${connectionName}" (ID: ${endpoint.id}). Sharing with "${targetProject}"...`);

      // 3. Check if already shared (optional, POST is usually idempotent or handled by API)
      const existingRefs = endpoint.serviceEndpointProjectReferences || [];
      const alreadyShared = existingRefs.some(
        (ref: any) => ref.projectReference?.id === targetProjectId,
      );

      if (alreadyShared) {
        ctx.logger.info(`Service Connection "${connectionName}" is already shared with "${targetProject}". Skipping.`);
        // Even if shared, we continue to ensure the authorization is set correctly below
      }

      // 4. PATCH to share it with the target project.
      // Aligning with Azure DevOps CLI v6_0 ServiceEndpointClient:
      // PATCH endpointId with an array of ServiceEndpointProjectReference
      const shareResponse = await fetch(
        `${orgUrl}/_apis/serviceendpoint/endpoints/${endpoint.id}?api-version=6.0-preview.4`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            {
              projectReference: {
                id: targetProjectId,
                name: targetProject,
              },
              name: connectionName,
              description: '',
            },
          ]),
        },
      );

      if (!shareResponse.ok) {
        if (shareResponse.status === 409) {
          // Already shared from a previous run — this is fine, continue to authorize
          ctx.logger.info(`Service Connection "${connectionName}" is already shared with "${targetProject}". Continuing to authorize...`);
        } else {
          const errorText = await shareResponse.text();
          throw new Error(`Failed to share service connection: ${shareResponse.status} - ${errorText}`);
        }
      } else {
        ctx.logger.info(`Successfully shared Service Connection "${connectionName}" with project "${targetProject}".`);
      }

      // 5. Authorize for all pipelines in the target project
      ctx.logger.info(`Authorizing service connection for all pipelines in "${targetProject}"...`);
      try {
        const authorizeResponse = await fetch(
          `${orgUrl}/${encodeURIComponent(targetProject)}/_apis/pipelines/pipelinepermissions/endpoint/${endpoint.id}?api-version=7.1-preview.1`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              allPipelines: {
                authorized: true,
                authorizedBy: null,
                authorizedOn: null,
              },
              pipelines: null,
              resource: {
                id: endpoint.id,
                type: 'endpoint',
              },
            }),
          },
        );

        if (authorizeResponse.ok) {
          ctx.logger.info(`Pipeline access granted for all pipelines in "${targetProject}".`);
        } else {
          const warnText = await authorizeResponse.text();
          ctx.logger.warn(`Could not auto-authorize pipelines (may need manual approval): ${warnText}`);
        }
      } catch (accessErr: any) {
        ctx.logger.warn(`Could not grant pipeline access: ${accessErr.message}`);
      }
    },
  });
}
