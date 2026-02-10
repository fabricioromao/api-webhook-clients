import { HttpService } from '@nestjs/axios';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import { lastValueFrom } from 'rxjs';

import {
  QueuesEnum,
  StorageUploadUtilsService,
  WebhookModuleType,
  WebhookSenderRequests,
  WebhookSenderRequestStatus,
} from 'src/shared';
import { CommissionPerClientDto } from 'src/shared/dto';

@Processor(QueuesEnum.COMMISSION_PER_CLIENT)
export class CommissionPerClientConsumer extends WorkerHost {
  private logger = new Logger(CommissionPerClientConsumer.name);

  constructor(
    @InjectModel(WebhookSenderRequests.name)
    private webhookSenderRequestsModel: Model<WebhookSenderRequests>,

    private readonly storageUploadUtilsService: StorageUploadUtilsService,
    private readonly http: HttpService,
  ) {
    super();
  }

  async process(job: Job<CommissionPerClientDto>) {
    try {
      const { id, apiKey, referenceDate, webhookUrl } = job.data;

      this.logger.debug(`Processando solicitação: ${id}`);

      if (!webhookUrl) {
        throw new Error('Webhook URL não fornecida');
      }

      const [existingRequest, currentRequest] = await Promise.all([
        this.webhookSenderRequestsModel
          .findOne({
            'sender.api_key': apiKey,
            reference_date: referenceDate,
            'request_params.module_type': WebhookModuleType.COMMISSION_PER_CLIENT,
            status: WebhookSenderRequestStatus.COMPLETED,
          })
          .sort({ createdAt: -1 })
          .select('status upload_url')
          .lean()
          .exec(),
        this.webhookSenderRequestsModel
          .findById(id)
          .select('status')
          .lean()
          .exec(),
      ]);

      if (!currentRequest) {
        throw new Error('Solicitação não encontrada com o ID: ' + id);
      }

      if (currentRequest.status !== WebhookSenderRequestStatus.PENDING) {
        throw new Error(
          'Solicitação já processada. Status atual: ' + currentRequest.status,
        );
      }

      const storageFilePath = `commissionperclient/${referenceDate}.zip`;
      const resolvedUploadUrl =
        existingRequest?.upload_url ||
        this.storageUploadUtilsService.getPublicFileUrl(storageFilePath);
      const resolvedFilePath =
        existingRequest?.upload_url
          ? this.storageUploadUtilsService.getRelativeFilePath(
              existingRequest.upload_url,
            )
          : storageFilePath;

      const fileExists =
        await this.storageUploadUtilsService.verifyFileExists(resolvedFilePath);
      if (!fileExists) {
        throw new Error(
          `Arquivo não encontrado para referência ${referenceDate}.`,
        );
      }

      const signedUrl =
        await this.storageUploadUtilsService.signedUrlWithExpiration(
          resolvedFilePath,
        );

      await this.updateRequest({
        id,
        upload_url: resolvedUploadUrl,
        signed_url: signedUrl,
      });

      return await this.sendToSenderWebhook({
        requestId: id,
        webhook_url: webhookUrl,
        signed_url: signedUrl,
      });
    } catch (error) {
      this.logger.error(
        `Erro ao processar solicitação: ${job.data.id} - ${error.message}`,
      );
      await this.updateRequest({
        id: job.data.id,
        status: WebhookSenderRequestStatus.FAILED,
        internal_error: error.message,
      });
    }
  }

  private async updateRequest(body: {
    id: string;
    status?: WebhookSenderRequestStatus;
    upload_url?: string;
    signed_url?: string;
    webhook_url_sent?: string;
    error_api?: string;
    internal_error?: string;
  }) {
    return await this.webhookSenderRequestsModel.updateOne(
      {
        _id: body.id,
      },
      {
        ...body,
        updatedAt: new Date(),
      },
    );
  }

  private async sendToSenderWebhook(data: {
    requestId: string;
    webhook_url: string;
    signed_url: string;
  }) {
    const { webhook_url, signed_url, requestId } = data;

    try {
      await lastValueFrom(
        this.http.post(
          webhook_url,
          { data: signed_url, type: WebhookModuleType.COMMISSION_PER_CLIENT },
          {
            validateStatus: (status) => status === 200 || status === 201,
          },
        ),
      );

      await this.updateRequest({
        id: requestId,
        status: WebhookSenderRequestStatus.COMPLETED,
        signed_url,
        webhook_url_sent: webhook_url,
      });

      this.logger.debug(
        `Dados enviados com sucesso para o webhook: ${webhook_url}`,
      );
    } catch (error) {
      return await this.updateRequest({
        id: requestId,
        status: WebhookSenderRequestStatus.FAILED,
        error_api: error.message,
        webhook_url_sent: webhook_url,
      });
    }
  }
}
