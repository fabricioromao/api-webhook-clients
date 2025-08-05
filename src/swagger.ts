import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

export const swagger = (app: INestApplication) => {
  const configService = app.get(ConfigService);
  const isProduction = configService.getOrThrow('NODE_ENV') === 'production';

  const config = new DocumentBuilder()
    .setTitle(isProduction ? 'Webhook' : 'Webhook Sandbox')
    .setDescription(
      isProduction
        ? 'API para envio e webhook'
        : 'API sandbox para envio e webhook',
    )
    .setVersion('1.0')
    .build();

  const content = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, content);

  app.use(
    '/reference',
    apiReference({
      content,
      layout: 'modern',
      theme: 'bluePlanet',
      darkMode: true,
      withFastify: true,
    }),
  );
};
