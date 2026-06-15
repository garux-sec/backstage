import React from 'react';
import { createFrontendModule, PageBlueprint } from '@backstage/frontend-plugin-api';
import { MitrpholTechRadarPage } from '../../components/techRadar/TechRadarPage';

const techRadarPage = PageBlueprint.make({
  params: {
    path: '/tech-radar',
    loader: async () => <MitrpholTechRadarPage />,
  },
});

export const techRadarModule = createFrontendModule({
  pluginId: 'tech-radar',
  extensions: [techRadarPage],
});
