import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Accounts,
  AccountsSchema,
  BankingReports,
  BankingReportsSchema,
  OpenFinance,
  OpenFinanceSchema,
  StorageUploadUtilsService,
  WebhookSenderRequests,
  WebhookSenderRequestsSchema,
} from 'src/shared';
import { AccountsMarketingConsumer } from './accounts-marketing.consumer';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookSenderRequests.name, schema: WebhookSenderRequestsSchema },
      { name: Accounts.name, schema: AccountsSchema },
      { name: BankingReports.name, schema: BankingReportsSchema },
      { name: OpenFinance.name, schema: OpenFinanceSchema },
    ]),
    HttpModule,
  ],
  controllers: [],
  providers: [AccountsMarketingConsumer, StorageUploadUtilsService],
})
export class AccountsMarketingModule {}
