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
import { RequestAccountsMarketingUseCase } from './use-cases/request-accounts-marketing.use-case';
import { WebhookRequestController } from './webhook-request.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookSenderRequests.name, schema: WebhookSenderRequestsSchema },
    ]),
    BullModule.registerQueue({
      name: QueuesEnum.ACCOUNTS_MARKETING,
    }),
    BullBoardModule.forFeature({
      name: QueuesEnum.ACCOUNTS_MARKETING,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [WebhookRequestController],
  providers: [RequestAccountsMarketingUseCase],
})
export class WebhookRequestModule {}
