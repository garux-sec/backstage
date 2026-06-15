import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import azureDevOpsPlugin from '@backstage-community/plugin-azure-devops/alpha';
import techdocsPlugin from '@backstage/plugin-techdocs/alpha';
import { techRadarModule } from './modules/techRadar';
import { sonarQubeModule } from './modules/sonarqube';
import { navModule } from './modules/nav';
import { microsoftSignInModule } from './modules/auth';

export default createApp({
  features: [catalogPlugin, azureDevOpsPlugin, techdocsPlugin, techRadarModule, sonarQubeModule, navModule, microsoftSignInModule],
});