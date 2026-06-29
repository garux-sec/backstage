import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Config } from '@backstage/config';

/**
 * Creates an Azure DevOps Variable Group (idempotent).
 * If the group already exists, updates its variables.
 * Supports plain-text and secret variables.
 */
export function createAzureVariableGroupEnsureAction(options: { config: Config }) {
  return createTemplateAction({
    id: 'azure:variablegroup:ensure',
    description: 'Creates or updates an Azure DevOps Variable Group (idempotent). Secrets are stored as secret variables.',
    schema: {
      input: (zImpl: any) => zImpl.object({
        organization: zImpl.string().describe('Azure DevOps Organization'),
        project:      zImpl.string().describe('Azure DevOps Project Name'),
        groupName:    zImpl.string().describe('Variable group name (e.g. my-app-secrets)'),
        variables: zImpl.array(
          zImpl.object({
            name:     zImpl.string().describe('Variable name'),
            value:    zImpl.string().describe('Variable value (use empty string for secrets to fill later)'),
            isSecret: zImpl.boolean().optional().describe('Mark as secret (hidden in logs)'),
          })
        ).describe('List of variables to add to the group'),
      }),
      output: (zImpl: any) => zImpl.object({
        groupId:   zImpl.number().describe('Variable group ID'),
        groupName: zImpl.string().describe('Variable group name'),
        created:   zImpl.boolean().describe('True if newly created, false if updated'),
      }),
    },
    async handler(ctx) {
      const { organization, project, groupName, variables } = ctx.input;

      const token = process.env.AZURE_DEVOPS_TOKEN ||
        options.config.getOptionalString('integrations.azure[0].credentials[0].personalAccessToken');
      if (!token) throw new Error('Azure DevOps token is missing');

      const orgUrl    = `https://dev.azure.com/${organization}`;
      const authHeader = `Basic ${Buffer.from(`:${token}`).toString('base64')}`;
      const headers   = { Authorization: authHeader, 'Content-Type': 'application/json' };

      // ── Build variables map ────────────────────────────────────────────────
      const variablesMap: Record<string, { value: string; isSecret: boolean }> = {};
      for (const v of variables) {
        variablesMap[v.name] = {
          value:    v.value ?? '',
          isSecret: v.isSecret ?? false,
        };
      }

      // ── 1. Check if group exists ───────────────────────────────────────────
      ctx.logger.info(`Checking if variable group "${groupName}" exists in "${project}"...`);
      const listRes = await fetch(
        `${orgUrl}/${encodeURIComponent(project)}/_apis/distributedtask/variablegroups?groupName=${encodeURIComponent(groupName)}&api-version=7.1`,
        { headers },
      );
      if (!listRes.ok) throw new Error(`Failed to list variable groups: ${listRes.status}`);

      const listData: any = await listRes.json();
      const existing = listData.value?.find(
        (g: any) => g.name?.toLowerCase() === groupName.toLowerCase(),
      );

      // ── 2a. Update if exists ───────────────────────────────────────────────
      if (existing) {
        ctx.logger.info(`Variable group "${groupName}" exists (ID: ${existing.id}). Updating variables...`);

        // Merge: keep existing variables, add/overwrite new ones
        const mergedVars = { ...existing.variables };
        for (const [key, val] of Object.entries(variablesMap)) {
          // Don't overwrite secrets that already have values (avoid clearing KV-linked secrets)
          if (mergedVars[key]?.isSecret && mergedVars[key]?.value === '') continue;
          mergedVars[key] = val;
        }

        const updateRes = await fetch(
          `${orgUrl}/${encodeURIComponent(project)}/_apis/distributedtask/variablegroups/${existing.id}?api-version=7.1`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              id:          existing.id,
              name:        groupName,
              type:        'Vsts',
              variables:   mergedVars,
              description: `Managed by MP-Backstage scaffolder — project: ${project}`,
            }),
          },
        );

        if (!updateRes.ok) {
          const err = await updateRes.text();
          throw new Error(`Failed to update variable group: ${updateRes.status} - ${err}`);
        }

        ctx.logger.info(`Variable group "${groupName}" updated.`);
        await authorizeVariableGroupForAllPipelines(ctx, orgUrl, project, existing.id, headers, groupName);
        ctx.output('groupId',   existing.id);
        ctx.output('groupName', groupName);
        ctx.output('created',   false);
        return;
      }

      // ── 2b. Create if not exists ───────────────────────────────────────────
      // Get project ID (required for variableGroupProjectReferences)
      ctx.logger.info(`Looking up project ID for "${project}"...`);
      const projectRes = await fetch(
        `${orgUrl}/_apis/projects/${encodeURIComponent(project)}?api-version=7.1`,
        { headers },
      );
      if (!projectRes.ok) throw new Error(`Failed to get project: ${projectRes.status}`);
      const projectData: any = await projectRes.json();
      const projectId = projectData.id;

      ctx.logger.info(`Creating variable group "${groupName}" in "${project}"...`);
      const createRes = await fetch(
        `${orgUrl}/${encodeURIComponent(project)}/_apis/distributedtask/variablegroups?api-version=7.1`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name:        groupName,
            type:        'Vsts',
            variables:   variablesMap,
            description: `Managed by MP-Backstage scaffolder — project: ${project}`,
            variableGroupProjectReferences: [
              {
                name: groupName,
                description: `Managed by MP-Backstage scaffolder — project: ${project}`,
                projectReference: {
                  id:   projectId,
                  name: project,
                },
              },
            ],
          }),
        },
      );

      if (!createRes.ok) {
        const err = await createRes.text();
        throw new Error(`Failed to create variable group: ${createRes.status} - ${err}`);
      }

      const created: any = await createRes.json();
      ctx.logger.info(`Variable group "${groupName}" created (ID: ${created.id}).`);
      await authorizeVariableGroupForAllPipelines(ctx, orgUrl, project, created.id, headers, groupName);
      ctx.output('groupId',   created.id);
      ctx.output('groupName', groupName);
      ctx.output('created',   true);
    },
  });
}

async function authorizeVariableGroupForAllPipelines(
  ctx: any, orgUrl: string, project: string, groupId: number,
  headers: Record<string, string>, groupName: string,
) {
  ctx.logger.info(`Authorizing variable group "${groupName}" for all pipelines...`);
  try {
    const response = await fetch(
      `${orgUrl}/${encodeURIComponent(project)}/_apis/pipelines/pipelinepermissions/variablegroup/${groupId}?api-version=7.1-preview.1`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          allPipelines: { authorized: true, authorizedBy: null, authorizedOn: null },
          pipelines: null,
          resource: { id: `${groupId}`, type: 'variablegroup' },
        }),
      },
    );

    if (response.ok) {
      ctx.logger.info(`Variable group "${groupName}" authorized for all pipelines.`);
    } else {
      const warnText = await response.text();
      ctx.logger.warn(`Could not auto-authorize variable group: ${warnText}`);
    }
  } catch (err: any) {
    ctx.logger.warn(`Could not authorize variable group: ${err.message}`);
  }
}
