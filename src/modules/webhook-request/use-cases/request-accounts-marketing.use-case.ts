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
import { AccountsMarketingDto } from 'src/shared/dto';
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

    if (existingRequest?.status == WebhookSenderRequestStatus.PENDING) {
      throw new InternalServerErrorException(
        'Existe uma solicitação pendente.',
      );
    }

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

    const savedRequest = await newRequest.save();

    if (!savedRequest) {
      throw new InternalServerErrorException('Erro ao salvar a solicitação.');
    }

    await this.accountsQueue.add(
      QueuesEnum.ACCOUNTS_MARKETING,
      new AccountsMarketingDto({
        id: savedRequest._id as string,
        apiKey: sender.api_key,
        referenceDate: reference_date,
        webhookUrl: sender.webhook_url,
      }),
    );

    return null;
  }
}
