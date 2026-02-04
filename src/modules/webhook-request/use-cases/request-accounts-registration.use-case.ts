import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';
import {
  QueuesEnum,
  WebhookModuleType,
  WebhookSenderRequests,
  WebhookSenderRequestStatus,
  WebhookSenderRequestType,
} from 'src/shared';
import { AccountsRegistrationDto } from 'src/shared/dto';
import { RequestType } from 'src/shared/types/request.types';
import { formatDate, resolveWebhookUrl } from 'src/shared/utils';

@Injectable()
export class RequestAccountsRegistrationUseCase {
  constructor(
    @InjectModel(WebhookSenderRequests.name)
    private webhookSenderRequestsModel: Model<WebhookSenderRequests>,

    @InjectQueue(QueuesEnum.ACCOUNTS_REGISTRATION)
    private accountsRegistrationQueue: Queue,
  ) {}

  async execute(req: RequestType) {
    const { sender } = req;

    const webhookUrl = resolveWebhookUrl(
      sender,
      WebhookModuleType.CLIENT_REGISTRATION,
    );
    if (!webhookUrl) {
      throw new BadRequestException(
        'Webhook URL não configurada para client_registration.',
      );
    }

    const reference_date = formatDate(new Date(), 'yyyy-MM-dd');

    const existingRequest = await this.webhookSenderRequestsModel
      .findOne({
        type: WebhookSenderRequestType.ACCOUNTS_REGISTRATION,
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
        webhook_url: webhookUrl,
      },
      type: WebhookSenderRequestType.ACCOUNTS_REGISTRATION,
      status: WebhookSenderRequestStatus.PENDING,
      reference_date,
      request_params: { module_type: WebhookModuleType.CLIENT_REGISTRATION },
    });

    const savedRequest = await newRequest.save();

    if (!savedRequest) {
      throw new InternalServerErrorException('Erro ao salvar a solicitação.');
    }

    await this.accountsRegistrationQueue.add(
      QueuesEnum.ACCOUNTS_REGISTRATION,
      new AccountsRegistrationDto({
        id: savedRequest._id as string,
        apiKey: sender.api_key,
        referenceDate: reference_date,
        webhookUrl,
      }),
    );

    return null;
  }
}
