import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Accounts,
  AccountsSchema,
  CreditCardSpendingHistory,
  CreditCardSpendingHistorySchema,
  WebhookSenderRequests,
  WebhookSenderRequestsSchema,
} from 'src/shared';
import { CreditCardSpendingConsumer } from './credit-card-spending.consumer';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookSenderRequests.name, schema: WebhookSenderRequestsSchema },
      { name: Accounts.name, schema: AccountsSchema },
      {
        name: CreditCardSpendingHistory.name,
        schema: CreditCardSpendingHistorySchema,
      },
    ]),
    HttpModule,
  ],
  controllers: [],
  providers: [CreditCardSpendingConsumer],
})
export class CreditCardSpendingModule {}
