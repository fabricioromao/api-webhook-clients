import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { swagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PREFIX = 'api';

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
  app.setGlobalPrefix(PREFIX);

  swagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
