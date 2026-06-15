import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Config } from '@backstage/config';

export function createAzureSshServiceConnectionAction(options: { config: Config }) {
  return createTemplateAction({
    id: 'azure:service-connection:create-ssh',
    description: 'Creates an SSH Service Connection in an Azure DevOps Project.',
    schema: {
      input: (zImpl: any) => zImpl.object({
        organization: zImpl.string().describe('The Azure DevOps Organization'),
        project: zImpl.string().describe('The Azure DevOps Project Name'),
        connectionName: zImpl.string().describe('Name for the SSH service connection'),
        host: zImpl.string().describe('SSH host IP or hostname'),
        port: zImpl.string().optional().describe('SSH port (default: 22)'),
        username: zImpl.string().describe('SSH username'),
        password: zImpl.string().optional().describe('SSH password'),
        privateKey: zImpl.string().optional().describe('SSH private key'),
      }),
    },
    async handler(ctx) {
      const { organization, project, connectionName, host, username, password, privateKey } = ctx.input;
      const port = ctx.input.port || '22';

      const token = process.env.AZURE_DEVOPS_TOKEN || options.config.getOptionalString('integrations.azure[0].credentials[0].personalAccessToken');
      if (!token) {
        throw new Error('Azure DevOps token is missing');
      }

      const orgUrl = `https://dev.azure.com/${organization}`;

      // First check if service connection already exists
      ctx.logger.info(`Checking if SSH service connection "${connectionName}" already exists in project ${project}...`);

      const authHeader = `Basic ${Buffer.from(`:${token}`).toString('base64')}`;
      const baseApiUrl = `${orgUrl}/${encodeURIComponent(project)}/_apis/serviceendpoint`;

      // List existing endpoints
      const listResponse = await fetch(`${baseApiUrl}/endpoints?type=ssh&api-version=7.1`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (listResponse.ok) {
        const listData: any = await listResponse.json();
        const existing = listData.value?.find(
          (ep: any) => ep.name?.toLowerCase() === connectionName.toLowerCase(),
        );
        if (existing) {
          ctx.logger.info(`SSH service connection "${connectionName}" already exists. Skipping creation.`);
          return;
        }
      }

      // Build authorization based on whether password or privateKey is provided
      let authorization: any;
      if (privateKey) {
        authorization = {
          parameters: {
            username,
            privateKey,
          },
          scheme: 'PrivateKey',
        };
      } else {
        authorization = {
          parameters: {
            username,
            password: password || '',
          },
          scheme: 'UsernamePassword',
        };
      }

      // Get project ID (GUID) - required for service endpoint creation
      ctx.logger.info(`Fetching project ID for "${project}"...`);
      const projectResponse = await fetch(
        `${orgUrl}/_apis/projects/${encodeURIComponent(project)}?api-version=7.1`,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!projectResponse.ok) {
        throw new Error(`Failed to fetch project details: ${projectResponse.status} ${projectResponse.statusText}`);
      }

      const projectData: any = await projectResponse.json();
      const projectId = projectData.id;
      ctx.logger.info(`Project ID: ${projectId}`);

      // Create the SSH service endpoint
      const endpointPayload = {
        name: connectionName,
        type: 'ssh',
        url: `ssh://${host}:${port}`,
        authorization,
        data: {
          Host: host,
          Port: port,
        },
        isShared: false,
        isReady: true,
        serviceEndpointProjectReferences: [
          {
            projectReference: {
              id: projectId,
              name: project,
            },
            name: connectionName,
          },
        ],
      };

      ctx.logger.info(`Creating SSH service connection "${connectionName}" for ${host}:${port} (user: ${username}, password: ****)...`);

      const createResponse = await fetch(`${baseApiUrl}/endpoints?api-version=7.1`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(endpointPayload),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create SSH service connection: ${createResponse.status} ${createResponse.statusText} - ${errorText}`);
      }

      const result: any = await createResponse.json();
      ctx.logger.info(`SSH service connection "${connectionName}" created successfully. ID: ${result.id}`);

      // Grant access to all pipelines in the project
      ctx.logger.info(`Granting pipeline access to service connection...`);
      try {
        const patchResponse = await fetch(
          `${baseApiUrl}/endpoints/${result.id}?api-version=7.1`,
          {
            method: 'PUT',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...endpointPayload,
              id: result.id,
              isShared: false,
              isReady: true,
              serviceEndpointProjectReferences: [
                {
                  projectReference: {
                    id: projectId,
                    name: project,
                  },
                  name: connectionName,
                },
              ],
            }),
          },
        );

        if (patchResponse.ok) {
          ctx.logger.info(`Pipeline access granted.`);
        }
      } catch (accessErr: any) {
        ctx.logger.warn(`Could not grant pipeline access (may need manual approval): ${accessErr.message}`);
      }
    },
  });
}
