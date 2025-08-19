import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, getSchemaPath, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { WebhookDataPayloadDto } from './shared/dto';

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

  const content = SwaggerModule.createDocument(app, config, {
    extraModels: [WebhookDataPayloadDto],
  });

  // Criamos um "path fantasma" só para documentação do retorno do webhook
  content.paths['/webhooks/clients-callback (documentação)'] = {
    post: {
      tags: ['Webhooks'],
      summary: 'Retorno do webhook de clientes',
      description:
        'Este endpoint **não existe** na API. Serve apenas para documentar o **payload** que sua aplicação receberá no webhook.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: getSchemaPath(WebhookDataPayloadDto) },
            examples: {
              exemplo: {
                summary: 'Exemplo de payload',
                value: {
                  data: 'https://storage.googleapis.com/bucket/clients_marketing_2024-08-07_api123.zip?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=service%40project.iam.gserviceaccount.com%2F20240807%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20240807T140000Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=abc123...',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description:
            'Documento apenas ilustrativo do payload recebido. Sua aplicação de fato **não** responde a este path.',
        },
      },
    },
  };

  app.use(
    '/docs',
    apiReference({
      content,
      layout: 'modern',
      theme: 'bluePlanet',
      darkMode: true,
      hideDownloadButton: true,
      baseServerURL: 'https://app.galaxyerp.com.br/v1/api-webhook-clients',
    }),
  );
};
