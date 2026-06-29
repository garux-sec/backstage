/*
 * Hi!
 *
 * Note that this is an EXAMPLE Backstage backend. Please check the README.
 *
 * Happy hacking!
 */

import { createBackend } from '@backstage/backend-defaults';
import { createBackendModule, coreServices } from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { createAzureProjectEnsureExistsAction } from './scaffolder/actions/azureProjectEnsureExists';
import { createAzureSshServiceConnectionAction } from './scaffolder/actions/azureSshServiceConnectionCreate';
import { createAzurePipelineRunAction } from './scaffolder/actions/azurePipelineRun';
import { createAzurePipelineAuthorizePoolAction } from './scaffolder/actions/azurePipelineAuthorizePool';
import { createAzureServiceConnectionAuthorizeAction } from './scaffolder/actions/azureServiceConnectionAuthorize';
import { createAzurePipelineEnsureAction } from './scaffolder/actions/azurePipelineEnsure';
import { createAzureVariableGroupEnsureAction } from './scaffolder/actions/azureVariableGroupEnsure';
import { createAzureKeyVaultSetSecretAction } from './scaffolder/actions/azureKeyVaultSetSecret';
import { createAzureSonarQubeServiceConnectionAction } from './scaffolder/actions/azureSonarQubeServiceConnection';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));


backend.add(import('@backstage/plugin-auth-backend-module-microsoft-provider'));

// scaffolder plugin
backend.add(import('@backstage/plugin-scaffolder-backend'));

const customScaffolderModule = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'custom-azure-actions',
  register(reg) {
    reg.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ scaffolder, config }) {
        scaffolder.addActions(createAzureProjectEnsureExistsAction({ config }));
        scaffolder.addActions(createAzureSshServiceConnectionAction({ config }));
        scaffolder.addActions(createAzurePipelineRunAction({ config }));
        scaffolder.addActions(createAzurePipelineAuthorizePoolAction({ config }));
        scaffolder.addActions(createAzureServiceConnectionAuthorizeAction({ config }));
        scaffolder.addActions(createAzurePipelineEnsureAction({ config }));
        scaffolder.addActions(createAzureVariableGroupEnsureAction({ config }));
        scaffolder.addActions(createAzureKeyVaultSetSecretAction({ config }));
        scaffolder.addActions(createAzureSonarQubeServiceConnectionAction({ config }));
      },
    });
  },
});
backend.add(customScaffolderModule);
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-azure'));
backend.add(
  import('@backstage/plugin-scaffolder-backend-module-notifications'),
);

// techdocs plugin
backend.add(import('@backstage/plugin-techdocs-backend'));

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));
// See https://backstage.io/docs/backend-system/building-backends/migrating#the-auth-plugin
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
// See https://backstage.io/docs/auth/guest/provider

backend.add(import('@backstage-community/plugin-azure-devops-backend'));

backend.add(import('@backstage-community/plugin-sonarqube-backend'));

// catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);

// See https://backstage.io/docs/features/software-catalog/configuration#subscribing-to-catalog-errors
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
// See https://backstage.io/docs/permissions/getting-started for how to create your own permission policy
backend.add(
  import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);

// search plugin
backend.add(import('@backstage/plugin-search-backend'));

// search engine
// See https://backstage.io/docs/features/search/search-engines
backend.add(import('@backstage/plugin-search-backend-module-pg'));

// search collators
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// kubernetes plugin
backend.add(import('@backstage/plugin-kubernetes-backend'));

// notifications and signals plugins
backend.add(import('@backstage/plugin-notifications-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

// mcp actions plugin
backend.add(import('@backstage/plugin-mcp-actions-backend'));

backend.start();
