import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Config } from '@backstage/config';

export function createAzurePipelineRunAction(options: { config: Config }) {
  return createTemplateAction({
    id: 'azure:pipeline:queue-run',
    description: 'Queues a run for an Azure DevOps Pipeline.',
    schema: {
      input: (zImpl: any) => zImpl.object({
        organization: zImpl.string().describe('The Azure DevOps Organization'),
        project: zImpl.string().describe('The Azure DevOps Project Name'),
        pipelineName: zImpl.string().describe('Name of the pipeline to run'),
        branch: zImpl.string().optional().describe('Branch to run (default: main)'),
      }),
    },
    async handler(ctx) {
      const { organization, project, pipelineName, branch = 'main' } = ctx.input;

      const token = process.env.AZURE_DEVOPS_TOKEN || options.config.getOptionalString('integrations.azure[0].credentials[0].personalAccessToken');
      if (!token) {
        throw new Error('Azure DevOps token is missing');
      }

      const orgUrl = `https://dev.azure.com/${organization}`;
      const authHeader = `Basic ${Buffer.from(`:${token}`).toString('base64')}`;

      // Find the pipeline by name
      ctx.logger.info(`Looking up pipeline "${pipelineName}" in project ${project}...`);

      const listResponse = await fetch(
        `${orgUrl}/${encodeURIComponent(project)}/_apis/pipelines?api-version=7.1`,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!listResponse.ok) {
        const errText = await listResponse.text();
        throw new Error(`Failed to list pipelines: ${listResponse.status} - ${errText}`);
      }

      const listData: any = await listResponse.json();
      const pipeline = listData.value?.find(
        (p: any) => p.name?.toLowerCase() === pipelineName.toLowerCase(),
      );

      if (!pipeline) {
        ctx.logger.warn(`Pipeline "${pipelineName}" not found. Skipping auto-run.`);
        return;
      }

      ctx.logger.info(`Found pipeline "${pipelineName}" (ID: ${pipeline.id}). Queuing run...`);

      // Queue a pipeline run
      const runResponse = await fetch(
        `${orgUrl}/${encodeURIComponent(project)}/_apis/pipelines/${pipeline.id}/runs?api-version=7.1`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resources: {
              repositories: {
                self: {
                  refName: `refs/heads/${branch}`,
                },
              },
            },
          }),
        },
      );

      if (!runResponse.ok) {
        const errText = await runResponse.text();
        ctx.logger.warn(`Failed to queue pipeline run: ${runResponse.status} - ${errText}`);
        return;
      }

      const runResult: any = await runResponse.json();
      ctx.logger.info(`Pipeline run queued successfully. Run ID: ${runResult.id}, State: ${runResult.state}`);
    },
  });
}
