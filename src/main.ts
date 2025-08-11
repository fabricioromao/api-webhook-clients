import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvSchemaType } from './shared';
import { swagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors
          .map((error) => Object.values(error.constraints || {}).join(', '))
          .filter((msg) => !!msg) // remove undefined/null
          .join(', '); // concatena todas separadas por vírgula

        return new BadRequestException(messages);
      },
    }),
  );

  swagger(app);
  const configService = app.get(ConfigService<EnvSchemaType>);
  const logger = new Logger('Main');
  const PORT = configService.getOrThrow('PORT');

  try {
    await app.listen(PORT);
    logger.debug(`Application is running on: http://localhost:${PORT}`);
  } catch (error) {
    logger.error('Error during application bootstrap', error);
  }
}
bootstrap();
