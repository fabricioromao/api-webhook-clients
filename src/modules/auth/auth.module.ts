import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookSenderConfig, WebhookSenderConfigSchema } from 'src/shared';
import { AuthController } from './auth.controller';
import { CreateNewSenderUseCase } from './uses-cases/create-new-sender.use-case';
import { GenerateTokenUseCase } from './uses-cases/generate-token.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookSenderConfig.name, schema: WebhookSenderConfigSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [CreateNewSenderUseCase, GenerateTokenUseCase],
})
export class AuthModule {}
