import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  QueuesEnum,
  WebhookSenderRequests,
  WebhookSenderRequestsSchema,
} from 'src/shared';
import { RequestAccountsUseCase } from './use-cases/request-accounts.use-case';
import { WebhookRequestController } from './webhook-request.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookSenderRequests.name, schema: WebhookSenderRequestsSchema },
    ]),
    BullModule.registerQueue({
      name: QueuesEnum.ACCOUNTS,
    }),
    BullBoardModule.forFeature({
      name: QueuesEnum.ACCOUNTS,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [WebhookRequestController],
  providers: [RequestAccountsUseCase],
})
export class WebhookRequestModule {}
