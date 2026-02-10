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
  StorageUploadUtilsService,
  WebhookModuleType,
  WebhookSenderRequests,
  WebhookSenderRequestStatus,
  WebhookSenderRequestType,
} from 'src/shared';
import { CommissionPerClientDto } from 'src/shared/dto';
import { RequestType } from 'src/shared/types/request.types';
import { resolveWebhookUrl } from 'src/shared/utils';

@Injectable()
export class RequestCommissionPerClientUseCase {
  constructor(
    @InjectModel(WebhookSenderRequests.name)
    private webhookSenderRequestsModel: Model<WebhookSenderRequests>,

    @InjectQueue(QueuesEnum.COMMISSION_PER_CLIENT)
    private commissionPerClientQueue: Queue,

    private readonly storageUploadUtilsService: StorageUploadUtilsService,
  ) {}

  async execute(req: RequestType, referenceDate: string) {
    const { sender } = req;

    const webhookUrl = resolveWebhookUrl(
      sender,
      WebhookModuleType.COMMISSION_PER_CLIENT,
    );
    if (!webhookUrl) {
      throw new BadRequestException(
        'Webhook URL não configurada para commission_per_client.',
      );
    }

    const storageFilePath = `commissionperclient/${referenceDate}.zip`;
    const fileExists =
      await this.storageUploadUtilsService.verifyFileExists(storageFilePath);
    if (!fileExists) {
      throw new BadRequestException(
        `Arquivo não encontrado para a data ${referenceDate}.`,
      );
    }

    const existingRequest = await this.webhookSenderRequestsModel
      .findOne({
        type: WebhookSenderRequestType.COMMISSION_PER_CLIENT,
        'sender.api_key': sender.api_key,
        reference_date: referenceDate,
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
        webhook_url: webhookUrl,
      },
      type: WebhookSenderRequestType.COMMISSION_PER_CLIENT,
      status: WebhookSenderRequestStatus.PENDING,
      reference_date: referenceDate,
      request_params: {
        module_type: WebhookModuleType.COMMISSION_PER_CLIENT,
        storage_file_path: storageFilePath,
      },
    });

    const savedRequest = await newRequest.save();

    if (!savedRequest) {
      throw new InternalServerErrorException('Erro ao salvar a solicitação.');
    }

    await this.commissionPerClientQueue.add(
      QueuesEnum.COMMISSION_PER_CLIENT,
      new CommissionPerClientDto({
        id: savedRequest._id as string,
        apiKey: sender.api_key,
        referenceDate,
        webhookUrl,
      }),
    );

    return null;
  }
}
