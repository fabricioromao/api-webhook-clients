import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { StorageUploadUtilsService, WebhookSenderRequests } from 'src/shared';

@Injectable()
export class RemoveOldUploadsUseCase implements OnModuleInit {
  private readonly logger = new Logger(RemoveOldUploadsUseCase.name);

  constructor(
    @InjectModel(WebhookSenderRequests.name)
    private readonly webhookSenderRequestsModel: Model<WebhookSenderRequests>,

    private readonly storageUploadUtilsService: StorageUploadUtilsService,
  ) {}

  async onModuleInit() {
    // await this.execute();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'America/Sao_Paulo',
  })
  async execute() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const requests = await this.webhookSenderRequestsModel
      .find({
        createdAt: { $lt: threeDaysAgo },
        is_deleted: false,
        upload_url: { $exists: true, $ne: null },
      })
      .select('_id upload_url')
      .lean()
      .exec();

    if (!requests?.length) {
      this.logger.log('No old uploads found to remove. Skipping.');
      return;
    }

    this.logger.log(`Found ${requests.length} old uploads to remove.`);

    for (const request of requests) {
      try {
        const uploadPath = request.upload_url?.replace(
          'https://storage.googleapis.com/galaxyerp/',
          '',
        );

        const deleteResponse =
          await this.storageUploadUtilsService.deleteFromStorage(uploadPath);

        if (!deleteResponse) throw new Error('Delete operation failed');

        await this.webhookSenderRequestsModel.updateOne(
          { _id: request._id },
          { is_deleted: true },
        );

        this.logger.debug(
          `Successfully removed upload for request ID ${request._id}`,
        );
      } catch (error) {
        // this.logger.error(
        //   `Failed to remove upload for request ID ${request._id}: ${error.message}`,
        // );
        continue;
      }
    }

    this.logger.debug('Old uploads removal process completed.');
  }
}
