import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Config } from '@backstage/config';

/**
 * Creates or updates an Azure DevOps Pipeline (idempotent).
 * If a pipeline with the same name already exists, it skips creation.
 */
export function createAzurePipelineEnsureAction(options: { config: Config }) {
  return createTemplateAction({
    id: 'azure:pipeline:ensure',
    description: 'Creates an Azure DevOps Pipeline if it does not already exist (idempotent).',
    schema: {
      input: (zImpl: any) => zImpl.object({
        organization: zImpl.string().describe('Azure DevOps Organization'),
        project: zImpl.string().describe('Azure DevOps Project Name'),
        pipelineName: zImpl.string().describe('Name of the pipeline to create'),
        repository: zImpl.string().describe('Name of the repository containing the pipeline YAML'),
        pipelineYamlFile: zImpl.string().optional().describe('Path to the pipeline YAML file (default: azure-pipelines.yml)'),
        branch: zImpl.string().optional().describe('Default branch (default: main)'),
      }),
      output: (zImpl: any) => zImpl.object({
        pipelineId: zImpl.number().describe('Pipeline definition ID'),
      }),
    },
    async handler(ctx) {
      const {
        organization,
        project,
        pipelineName,
        repository,
        pipelineYamlFile = 'azure-pipelines.yml',
        branch = 'main',
      } = ctx.input;

      const token = process.env.AZURE_DEVOPS_TOKEN || options.config.getOptionalString('integrations.azure[0].credentials[0].personalAccessToken');
      if (!token) throw new Error('Azure DevOps token is missing');

      const orgUrl = `https://dev.azure.com/${organization}`;
      const authHeader = `Basic ${Buffer.from(`:${token}`).toString('base64')}`;
      const headers = { 'Authorization': authHeader, 'Content-Type': 'application/json' };

      // ── 1. Check if pipeline already exists ─────────────────────────────────
      ctx.logger.info(`Checking if pipeline "${pipelineName}" already exists in "${project}"...`);
      const listRes = await fetch(
        `${orgUrl}/${encodeURIComponent(project)}/_apis/pipelines?api-version=7.1`,
        { headers },
      );
      if (!listRes.ok) throw new Error(`Failed to list pipelines: ${listRes.status}`);

      const listData: any = await listRes.json();
      const existing = listData.value?.find(
        (p: any) => p.name?.toLowerCase() === pipelineName.toLowerCase(),
      );

      if (existing) {
        ctx.logger.info(`Pipeline "${pipelineName}" already exists (ID: ${existing.id}). Skipping creation.`);
        ctx.output('pipelineId', existing.id);
        return;
      }

      // ── 2. Get repo ID ───────────────────────────────────────────────────────
      ctx.logger.info(`Looking up repository "${repository}" in "${project}"...`);
      const repoRes = await fetch(
        `${orgUrl}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repository)}?api-version=7.1`,
        { headers },
      );
      if (!repoRes.ok) throw new Error(`Failed to find repository "${repository}": ${repoRes.status}`);
      const repoData: any = await repoRes.json();

      // ── 3. Create pipeline ───────────────────────────────────────────────────
      ctx.logger.info(`Creating pipeline "${pipelineName}"...`);
      const createRes = await fetch(
        `${orgUrl}/${encodeURIComponent(project)}/_apis/pipelines?api-version=7.1`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: pipelineName,
            folder: '\\',
            configuration: {
              type: 'yaml',
              path: pipelineYamlFile,
              repository: {
                id: repoData.id,
                type: 'azureReposGit',
                defaultBranch: `refs/heads/${branch}`,
              },
            },
          }),
        },
      );

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to create pipeline: ${createRes.status} - ${errText}`);
      }

      const created: any = await createRes.json();
      ctx.logger.info(`Pipeline "${pipelineName}" created successfully (ID: ${created.id}).`);
      ctx.output('pipelineId', created.id);
    },
  });
}
