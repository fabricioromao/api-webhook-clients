import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StorageUploadUtilsService,
  WebhookSenderRequests,
  WebhookSenderRequestsSchema,
} from 'src/shared';
import { CommissionPerClientConsumer } from './commission-per-client.consumer';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookSenderRequests.name, schema: WebhookSenderRequestsSchema },
    ]),
    HttpModule,
  ],
  providers: [CommissionPerClientConsumer, StorageUploadUtilsService],
})
export class CommissionPerClientModule {}
