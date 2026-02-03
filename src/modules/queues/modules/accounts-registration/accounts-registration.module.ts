import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Accounts,
  AccountsSchema,
  CustomerEngagement,
  CustomerEngagementSchema,
  StorageUploadUtilsService,
  WebhookSenderRequests,
  WebhookSenderRequestsSchema,
} from 'src/shared';
import { AccountsRegistrationConsumer } from './accounts-registration.consumer';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookSenderRequests.name, schema: WebhookSenderRequestsSchema },
      { name: Accounts.name, schema: AccountsSchema },
      { name: CustomerEngagement.name, schema: CustomerEngagementSchema },
    ]),
    HttpModule,
  ],
  controllers: [],
  providers: [AccountsRegistrationConsumer, StorageUploadUtilsService],
})
export class AccountsRegistrationModule {}
