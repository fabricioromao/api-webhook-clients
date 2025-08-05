import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { QueuesModule } from './modules/queues/queues.module';
import { WebhookRequestModule } from './modules/webhook-request/webhook-request.module';
import { WebhookSenderConfig, WebhookSenderConfigSchema } from './shared';
import { AuthGuard } from './shared/guards';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    WebhookRequestModule,
    QueuesModule,
    MongooseModule.forFeature([
      { name: WebhookSenderConfig.name, schema: WebhookSenderConfigSchema },
    ]),
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
