import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Accounts,
  AccountsSchema,
  PositionsByAccount,
  PositionsByAccountSchema,
  StorageUploadUtilsService,
  WebhookSenderRequests,
  WebhookSenderRequestsSchema,
} from 'src/shared';
import { AccountsAssetsConsumer } from './accounts-assets.consumer';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookSenderRequests.name, schema: WebhookSenderRequestsSchema },
      { name: Accounts.name, schema: AccountsSchema },
      { name: PositionsByAccount.name, schema: PositionsByAccountSchema },
    ]),
    HttpModule,
  ],
  controllers: [],
  providers: [AccountsAssetsConsumer, StorageUploadUtilsService],
})
export class AccountsAssetsModule {}
