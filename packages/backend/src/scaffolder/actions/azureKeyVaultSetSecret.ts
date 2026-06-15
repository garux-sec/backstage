import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Config } from '@backstage/config';

/**
 * Sets one or more secrets in Azure Key Vault.
 * Uses service principal credentials (client_id / client_secret / tenant_id)
 * from env vars or Backstage config (same SP used for Azure AD auth).
 */
export function createAzureKeyVaultSetSecretAction(options: { config: Config }) {
  return createTemplateAction({
    id: 'azure:keyvault:set-secret',
    description: 'Sets one or more secrets in Azure Key Vault using service principal auth.',
    schema: {
      input: (zImpl: any) => zImpl.object({
        keyVaultName: zImpl.string().describe('Azure Key Vault name (e.g. mp-dev-kv)'),
        namePrefix: zImpl.string().optional().describe('Prefix to prepend to all secret names (e.g. myapp-)'),
        environment: zImpl.string().optional().describe('Filter secrets by environment tag: all | dev | staging | prod'),
        secrets: zImpl.array(
          zImpl.object({
            name:        zImpl.string().describe('Secret name in Key Vault'),
            value:       zImpl.string().describe('Secret value'),
            environment: zImpl.string().optional().describe('Target environment: all | dev | staging | prod'),
          })
        ).describe('List of secrets to set'),
      }),
      output: (zImpl: any) => zImpl.object({
        keyVaultName: zImpl.string(),
        secretsSet:   zImpl.array(zImpl.string()),
        secretsSkipped: zImpl.array(zImpl.string()),
      }),
    },
    async handler(ctx) {
      const { keyVaultName, secrets, namePrefix = '', environment } = ctx.input;

      // ── Get SP credentials ────────────────────────────────────────────────
      const tenantId     = process.env.AUTH_MICROSOFT_TENANT_ID     || options.config.getOptionalString('auth.providers.microsoft.development.tenantId');
      const clientId     = process.env.AUTH_MICROSOFT_CLIENT_ID     || options.config.getOptionalString('auth.providers.microsoft.development.clientId');
      const clientSecret = process.env.AUTH_MICROSOFT_CLIENT_SECRET || options.config.getOptionalString('auth.providers.microsoft.development.clientSecret');

      if (!tenantId || !clientId || !clientSecret) {
        throw new Error(
          'Azure AD credentials missing. Set AUTH_MICROSOFT_TENANT_ID, AUTH_MICROSOFT_CLIENT_ID, AUTH_MICROSOFT_CLIENT_SECRET in env.'
        );
      }

      // ── 1. Get Azure AD access token for Key Vault ────────────────────────
      ctx.logger.info(`Getting Azure AD token for Key Vault "${keyVaultName}"...`);
      const tokenRes = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type:    'client_credentials',
            client_id:     clientId,
            client_secret: clientSecret,
            scope:         'https://vault.azure.net/.default',
          }),
        }
      );

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        throw new Error(`Failed to get Azure AD token: ${tokenRes.status} - ${err}`);
      }

      const { access_token: accessToken } = await tokenRes.json() as { access_token: string };
      ctx.logger.info('Azure AD token acquired.');

      // ── 2. Filter secrets by environment ─────────────────────────────────
      const filteredSecrets = secrets.filter(s => {
        if (!environment || environment === 'all') return true;
        const envTag = s.environment ?? 'all';
        return envTag === 'all' || envTag === environment;
      });

      ctx.logger.info(`Processing ${filteredSecrets.length}/${secrets.length} secrets for environment: ${environment ?? 'all'}`);

      // ── 3. Set each secret in Key Vault ───────────────────────────────────
      const secretsSet: string[]     = [];
      const secretsSkipped: string[] = [];
      const kvBaseUrl = `https://${keyVaultName}.vault.azure.net`;

      for (const secret of filteredSecrets) {
        const fullName = `${namePrefix}${secret.name}`;

        if (!secret.value) {
          ctx.logger.warn(`Skipping "${fullName}" — value is empty.`);
          secretsSkipped.push(fullName);
          continue;
        }

        ctx.logger.info(`Setting secret "${fullName}"...`);
        const setRes = await fetch(
          `${kvBaseUrl}/secrets/${encodeURIComponent(fullName)}?api-version=7.4`,
          {
            method: 'PUT',
            headers: {
              Authorization:  `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              value: secret.value,
              attributes: { enabled: true },
              tags: {
                managedBy:   'mp-backstage',
                environment: secret.environment ?? 'all',
              },
            }),
          }
        );

        if (!setRes.ok) {
          const err = await setRes.text();
          ctx.logger.warn(`Failed to set "${fullName}": ${setRes.status} - ${err}`);
          secretsSkipped.push(fullName);
          continue;
        }

        ctx.logger.info(`✅ Secret "${fullName}" set successfully.`);
        secretsSet.push(fullName);
      }

      ctx.output('keyVaultName',    keyVaultName);
      ctx.output('secretsSet',      secretsSet);
      ctx.output('secretsSkipped',  secretsSkipped);
      ctx.logger.info(`Done. ${secretsSet.length} set, ${secretsSkipped.length} skipped.`);
    },
  });
}
