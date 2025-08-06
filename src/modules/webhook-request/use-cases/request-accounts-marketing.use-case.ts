import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';
import {
  QueuesEnum,
  WebhookSenderRequests,
  WebhookSenderRequestStatus,
  WebhookSenderRequestType,
} from 'src/shared';
import { RequestType } from 'src/shared/types/request.types';

@Injectable()
export class RequestAccountsMarketingUseCase {
  constructor(
    @InjectModel(WebhookSenderRequests.name)
    private webhookSenderRequestsModel: Model<WebhookSenderRequests>,

    @InjectQueue(QueuesEnum.ACCOUNTS_MARKETING)
    private accountsQueue: Queue,
  ) {}

  async execute(req: RequestType) {
    const { sender } = req;

    const reference_date = new Date().toISOString().split('T')[0];

    const existingRequest = await this.webhookSenderRequestsModel
      .findOne({
        type: WebhookSenderRequestType.ACCOUNTS_MARKETING,
        'sender.api_key': sender.api_key,
        reference_date,
        status: { $ne: WebhookSenderRequestStatus.FAILED },
      })
      .select('upload_url _id status')
      .lean()
      .exec();

    if (!existingRequest) {
      const newRequest = new this.webhookSenderRequestsModel({
        sender: {
          id: sender.id,
          name: sender.name,
          api_key: sender.api_key,
          webhook_url: sender.webhook_url,
        },
        type: WebhookSenderRequestType.ACCOUNTS_MARKETING,
        status: WebhookSenderRequestStatus.PENDING,
        reference_date,
      });

      await newRequest.save();

      await this.accountsQueue.add(QueuesEnum.ACCOUNTS_MARKETING, {
        id: newRequest._id,
      });

      return {
        id: newRequest._id,
        reference_date: newRequest.reference_date,
      };
    }

    if (
      existingRequest?.status == WebhookSenderRequestStatus.PENDING ||
      existingRequest?.status == WebhookSenderRequestStatus.PROCESSING
    ) {
      throw new InternalServerErrorException(
        'Existe uma requisição pendente ou em processamento.',
      );
    }

    return {
      id: existingRequest._id,
      upload_url: existingRequest.upload_url,
      reference_date: existingRequest.reference_date,
    };
  }
}
