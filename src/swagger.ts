import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

export const swagger = (app: INestApplication) => {
  const configService = app.get(ConfigService);
  const isProduction = configService.getOrThrow('NODE_ENV') === 'production';

  const config = new DocumentBuilder()
    .setTitle(isProduction ? 'Webhook API' : 'Webhook API - Sandbox')
    .setDescription(
      `## Webhook API para solicitação e envio de dados

Esta API permite que clientes autorizados solicitem dados através de webhooks. O fluxo funciona da seguinte forma:

### Fluxo de Autenticação
1. **Obtenção de Token**: Use sua API Key para obter um token JWT
2. **Duração do Token**: Os tokens JWT têm validade de **5 minutos**
3. **Renovação**: Gere um novo token quando necessário

### Fluxo de Solicitação de Dados
1. **Autenticação**: Use o token JWT no header Authorization
2. **Solicitação**: Faça uma requisição para solicitar dados
3. **Processamento**: Os dados são processados em background
4. **Webhook**: Quando prontos, os dados são enviados para seu webhook URL
5. **SignedUrl**: O arquivo de dados fica disponível por **15 minutos** via signed URL

### Autenticação
Todos os endpoints (exceto geração de token) requerem autenticação via JWT Bearer Token.`,
    )
    .setVersion('1.0')
    .addTag(
      'Autenticação',
      'Endpoints para obtenção e gerenciamento de tokens JWT',
    )
    .addTag(
      'Solicitações de Webhook',
      'Endpoints para solicitar dados via webhook',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description:
          'Token JWT obtido através do endpoint /api/Auth/token (válido por 5 minutos)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'api-key',
        in: 'header',
        description: 'API Key fornecida pelo sistema para autenticação inicial',
      },
      'api-key',
    )
    .build();

  const content = SwaggerModule.createDocument(app, config);

  app.use(
    '/docs',
    apiReference({
      content,
      layout: 'modern',
      theme: 'bluePlanet',
      darkMode: true,
      hideDownloadButton: true,
      servers: [
        {
          url: 'https://app.galaxyerp.com.br/v1/api-webhook-clients',
          description: 'Produção',
        },
      ],
    }),
  );
};
