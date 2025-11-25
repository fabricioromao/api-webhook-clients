import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhookSenderRequests, WebhookSenderRequestsSchema } from 'src/shared';
import { RemoveOldUploadsUseCase } from './use-cases';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: WebhookSenderRequests.name, schema: WebhookSenderRequestsSchema },
    ]),
  ],
  providers: [RemoveOldUploadsUseCase],
})
export class CronJobsModule {}
