import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import * as azdev from 'azure-devops-node-api';
import * as CoreInterfaces from 'azure-devops-node-api/interfaces/CoreInterfaces';
import { Config } from '@backstage/config';

export function createAzureProjectEnsureExistsAction(options: { config: Config }) {
  return createTemplateAction({
    id: 'azure:project:ensure-exists',
    description: 'Ensures that an Azure DevOps Project exists, creating it if necessary.',
    schema: {
      input: (zImpl: any) => zImpl.object({
        organization: zImpl.string().describe('The Azure DevOps Organization'),
        project: zImpl.string().describe('The Azure DevOps Project Name'),
        description: zImpl.string().optional().describe('Optional description for the new project'),
      }),
    },
    async handler(ctx) {
      const { organization, project, description } = ctx.input;
      
      const token = process.env.AZURE_DEVOPS_TOKEN || options.config.getOptionalString('integrations.azure[0].credentials[0].personalAccessToken');
      if (!token) {
        throw new Error('Azure DevOps token is missing in configuration or AZURE_DEVOPS_TOKEN environment variable');
      }

      const orgUrl = `https://dev.azure.com/${organization}`;
      const authHandler = azdev.getPersonalAccessTokenHandler(token);
      const connection = new azdev.WebApi(orgUrl, authHandler);
      
      ctx.logger.info(`Getting Core API for ${orgUrl}`);
      const coreApi = await connection.getCoreApi();

      ctx.logger.info(`Checking if project ${project} exists...`);
      const existingProjects: CoreInterfaces.TeamProjectReference[] = await coreApi.getProjects();
      const projectExists = existingProjects.find(p => p.name?.toLowerCase() === project.toLowerCase());

      if (projectExists) {
        ctx.logger.info(`Project ${project} already exists. Skipping creation.`);
      } else {
        ctx.logger.info(`Project ${project} not found. Creating it...`);
        const projectToCreate: CoreInterfaces.TeamProject = {
          name: project,
          description: description || `Created via Backstage Scaffolder`,
          visibility: CoreInterfaces.ProjectVisibility.Private,
          capabilities: {
            versioncontrol: {
              sourceControlType: 'Git',
            },
            processTemplate: {
              templateTypeId: 'adcc42ab-9882-485e-a3ed-7678f01f66bc',
            },
          }
        };

        const operation = await coreApi.queueCreateProject(projectToCreate);
        ctx.logger.info(`Project creation queued. Operation ID: ${operation.id}`);

        let isComplete = false;
        let attempts = 0;
        let finalProject = null;
        
        while (!isComplete && attempts < 30) {
           await new Promise(resolve => setTimeout(resolve, 5000));
           const projs: CoreInterfaces.TeamProjectReference[] = await coreApi.getProjects();
           finalProject = projs.find(p => p.name?.toLowerCase() === project.toLowerCase());
           // 1 = WellFormed state, handle both number and string representations
           const state = finalProject?.state?.toString().toLowerCase();
           if (finalProject && (finalProject.state === 1 || state === '1' || state === 'wellformed')) {
              isComplete = true;
           } else {
              attempts++;
              ctx.logger.info(`Waiting for project ${project} to be fully created... (current state: ${finalProject?.state})`);
           }
        }
        
        if (!isComplete) {
            throw new Error(`Project creation timed out or failed.`);
        }
      }

      // Always rename the default repository to avoid name conflicts with publish step
      // Azure DevOps doesn't allow deleting the last repo, so we rename it instead
      ctx.logger.info(`Checking for default repository to rename in project ${project}...`);
      try {
        const gitApi = await connection.getGitApi();
        const repos = await gitApi.getRepositories(project);
        const defaultRepo = repos.find(r => r.name?.toLowerCase() === project.toLowerCase());
        
        if (defaultRepo && defaultRepo.id) {
          const suffix = Date.now().toString().slice(-6);
          const baseName = project.length > 50 ? project.slice(0, 50) : project;
          const newName = `${baseName}-bk${suffix}`;
          ctx.logger.info(`Renaming default repository "${defaultRepo.name}" to "${newName}"`);
          await gitApi.updateRepository(
            { name: newName } as any,
            defaultRepo.id,
            project,
          );
          ctx.logger.info(`Default repository renamed successfully.`);
        } else {
          ctx.logger.info(`No default repository found with name "${project}". Good to go.`);
        }
      } catch (repoErr: any) {
        ctx.logger.warn(`Failed to rename default repository: ${repoErr.message}`);
      }


      ctx.logger.info(`Successfully ensured project ${project} exists and is ready.`);

    },
  });
}
