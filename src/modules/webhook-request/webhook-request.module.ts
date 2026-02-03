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
import { RequestAccountsRegistrationUseCase } from './use-cases/request-accounts-registration.use-case';
import { RequestCreditCardSpendingUseCase } from './use-cases/request-credit-card-spending.use-case';
import { WebhookRequestController } from './webhook-request.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookSenderRequests.name, schema: WebhookSenderRequestsSchema },
    ]),
    BullModule.registerQueue({
      name: QueuesEnum.ACCOUNTS_MARKETING,
    }),
    BullModule.registerQueue({
      name: QueuesEnum.ACCOUNTS_REGISTRATION,
    }),
    BullModule.registerQueue({
      name: QueuesEnum.CREDIT_CARD_SPENDING,
    }),
    BullBoardModule.forFeature({
      name: QueuesEnum.ACCOUNTS_MARKETING,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueuesEnum.ACCOUNTS_REGISTRATION,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueuesEnum.CREDIT_CARD_SPENDING,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [WebhookRequestController],
  providers: [
    RequestAccountsMarketingUseCase,
    RequestAccountsRegistrationUseCase,
    RequestCreditCardSpendingUseCase,
  ],
})
export class WebhookRequestModule {}
