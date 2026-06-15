import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Config } from '@backstage/config';

export function createAzurePipelineAuthorizePoolAction(options: { config: Config }) {
  return createTemplateAction({
    id: 'azure:pipeline:authorize-pool',
    description: 'Grants access permission for an Agent Pool to all pipelines in the project.',
    schema: {
      input: (zImpl: any) => zImpl.object({
        organization: zImpl.string().describe('The Azure DevOps Organization'),
        project: zImpl.string().describe('The Azure DevOps Project Name'),
        poolName: zImpl.string().describe('The name of the Agent Pool (Queue) to authorize'),
      }),
    },
    async handler(ctx) {
      const { organization, project, poolName } = ctx.input;

      const token = process.env.AZURE_DEVOPS_TOKEN || options.config.getOptionalString('integrations.azure[0].credentials[0].personalAccessToken');
      if (!token) {
        throw new Error('Azure DevOps token is missing');
      }

      const orgUrl = `https://dev.azure.com/${organization}`;
      const authHeader = `Basic ${Buffer.from(`:${token}`).toString('base64')}`;

      ctx.logger.info(`Looking up Agent Pool (Queue) "${poolName}" in project ${project}...`);

      // 1. Get the queue ID in the project
      const queuesResponse = await fetch(
        `${orgUrl}/${encodeURIComponent(project)}/_apis/distributedtask/queues?queueName=${encodeURIComponent(poolName)}&api-version=7.1`,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!queuesResponse.ok) {
        const errorText = await queuesResponse.text();
        throw new Error(`Failed to fetch queues: ${queuesResponse.status} ${queuesResponse.statusText} - ${errorText}`);
      }

      const queuesData: any = await queuesResponse.json();
      if (!queuesData.value || queuesData.value.length === 0) {
        ctx.logger.warn(`Agent pool (Queue) "${poolName}" not found in project ${project}. Skipping authorization.`);
        return;
      }

      const queueId = queuesData.value[0].id;
      ctx.logger.info(`Found queue "${poolName}" with ID ${queueId}. Authorizing for all pipelines in project...`);

      // 2. Authorize the queue for all pipelines in the project
      const authResourceResponse = await fetch(
        `${orgUrl}/${encodeURIComponent(project)}/_apis/build/authorizedresources?api-version=7.1-preview.1`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            {
              authorized: true,
              id: queueId.toString(),
              name: poolName,
              type: 'queue',
            },
          ]),
        },
      );

      if (!authResourceResponse.ok) {
        const errorText = await authResourceResponse.text();
        ctx.logger.warn(`Failed to authorize agent pool: ${authResourceResponse.status} ${authResourceResponse.statusText} - ${errorText}`);
        return;
      }

      ctx.logger.info(`Successfully authorized agent pool "${poolName}" for all pipelines in project ${project}.`);
    },
  });
}
