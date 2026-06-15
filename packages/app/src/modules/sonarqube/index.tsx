import React from 'react';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { EntitySonarQubeCard } from '@backstage-community/plugin-sonarqube';

const sonarQubeEntityContent = EntityContentBlueprint.make({
  params: {
    path: '/sonarqube',
    title: 'SonarQube',
    loader: async () => (
      <EntitySonarQubeCard variant="gridItem" />
    ),
  },
});

export const sonarQubeModule = createFrontendModule({
  pluginId: 'sonarqube',
  extensions: [sonarQubeEntityContent],
});
