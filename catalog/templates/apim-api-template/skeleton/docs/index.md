# ${{ values.apiDisplayName }}

${{ values.apiDescription }}

## Overview

| Property | Value |
|---|---|
| **API Name** | `${{ values.apiName }}` |
| **Version** | `${{ values.apiVersion }}` |
| **Gateway URL** | `https://${{ values.apimServiceName }}.azure-api.net${{ values.apiPath }}` |
| **Owner** | idp-team |
| **Lifecycle** | Production |

## Getting Started

This API is managed through **Azure API Management (APIM)** and published via the Internal Developer Portal.

### Base URL

```
https://${{ values.apimServiceName }}.azure-api.net${{ values.apiPath }}
```

### Authentication

Contact the API owner for subscription keys or OAuth2 configuration.

## Endpoints

See the **API** tab in the Backstage catalog for the full interactive OpenAPI spec.

## CI/CD

The API spec is automatically deployed to APIM on every push to `main` via the pipeline `${{ values.apiName }}-apim-deploy`.

## Contact

For issues or questions, reach out to the **idp-team** via the internal ticketing system.
