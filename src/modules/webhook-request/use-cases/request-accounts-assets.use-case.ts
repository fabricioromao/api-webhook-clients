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
import { AccountsAssetsDto } from 'src/shared/dto';
import { RequestType } from 'src/shared/types/request.types';
import { formatDate } from 'src/shared/utils';

@Injectable()
export class RequestAccountsAssetsUseCase {
  constructor(
    @InjectModel(WebhookSenderRequests.name)
    private webhookSenderRequestsModel: Model<WebhookSenderRequests>,

    @InjectQueue(QueuesEnum.ACCOUNTS_ASSETS)
    private accountsAssetsQueue: Queue,
  ) {}

  async execute(req: RequestType, assetTypes?: string[]) {
    const { sender } = req;

    const reference_date = formatDate(new Date(), 'yyyy-MM-dd');
    const normalizedTypes = (assetTypes?.length ? assetTypes : ['all'])
      .map((value) => value.trim().toLowerCase())
      .sort();

    const existingRequest = await this.webhookSenderRequestsModel
      .findOne({
        type: WebhookSenderRequestType.ACCOUNTS_ASSETS,
        'sender.api_key': sender.api_key,
        reference_date,
        'request_params.asset_types': normalizedTypes,
        status: { $ne: WebhookSenderRequestStatus.FAILED },
      })
      .select('_id status')
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
        webhook_url: sender?.webhook_url || '',
      },
      type: WebhookSenderRequestType.ACCOUNTS_ASSETS,
      status: WebhookSenderRequestStatus.PENDING,
      reference_date,
      request_params: { asset_types: normalizedTypes },
    });

    const savedRequest = await newRequest.save();

    if (!savedRequest) {
      throw new InternalServerErrorException('Erro ao salvar a solicitação.');
    }

    await this.accountsAssetsQueue.add(
      QueuesEnum.ACCOUNTS_ASSETS,
      new AccountsAssetsDto({
        id: savedRequest._id as string,
        apiKey: sender.api_key,
        referenceDate: reference_date,
        webhookUrl: sender?.webhook_url || '',
        assetTypes: normalizedTypes,
      }),
    );

    return null;
  }
}
