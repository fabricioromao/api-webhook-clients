import { HttpService } from '@nestjs/axios';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import * as fs from 'fs/promises';
import { Model } from 'mongoose';
import { join } from 'path';
import { lastValueFrom } from 'rxjs';

import {
  Accounts,
  CreditCardSpendingHistory,
  QueuesEnum,
  StorageUploadUtilsService,
  WebhookModuleType,
  WebhookSenderRequests,
  WebhookSenderRequestStatus,
} from 'src/shared';
import { CreditCardSpendingDto } from 'src/shared/dto';

@Processor(QueuesEnum.CREDIT_CARD_SPENDING)
export class CreditCardSpendingConsumer extends WorkerHost {
  private logger = new Logger(CreditCardSpendingConsumer.name);
  private filePath = join(process.cwd(), 'credit_card_spending.json');

  constructor(
    @InjectModel(WebhookSenderRequests.name)
    private webhookSenderRequestsModel: Model<WebhookSenderRequests>,
    @InjectModel(Accounts.name)
    private accountsModel: Model<Accounts>,
    @InjectModel(CreditCardSpendingHistory.name)
    private creditCardSpendingHistoryModel: Model<CreditCardSpendingHistory>,

    private readonly storageUploadUtilsService: StorageUploadUtilsService,
    private readonly http: HttpService,
  ) {
    super();
  }

  async process(job: Job<CreditCardSpendingDto>) {
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
            'request_params.module_type': WebhookModuleType.CREDIT_CARD_SPENDING,
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

      if (existingRequest) {
        const signedUrl =
          await this.storageUploadUtilsService.signedUrlWithExpiration(
            this.storageUploadUtilsService.getRelativeFilePath(
              existingRequest.upload_url!,
            ),
          );

        await this.updateRequest({
          id,
          upload_url: existingRequest.upload_url,
          signed_url: signedUrl,
        });

        return await this.sendToSenderWebhook({
          requestId: id,
          webhook_url: webhookUrl!,
          signed_url: signedUrl,
        });
      }

      const payload = await this.buildPayload();
      const zipFile = await this.generateZipFromPayload(payload);

      const uploadUrl = await this.storageUploadUtilsService.uploadToStorage({
        apiKey,
        filePath: zipFile,
        referenceDate,
      });

      const signedUrl =
        await this.storageUploadUtilsService.signedUrlWithExpiration(
          this.storageUploadUtilsService.getRelativeFilePath(uploadUrl),
        );

      await fs.unlink(zipFile);

      await this.updateRequest({
        id,
        upload_url: uploadUrl,
        signed_url: signedUrl,
      });

      await this.sendToSenderWebhook({
        requestId: id,
        webhook_url: webhookUrl!,
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

  private async buildPayload() {
    const [accounts, spendings] = await Promise.all([
      this.accountsModel.find().lean().exec(),
      this.creditCardSpendingHistoryModel
        .find()
        .select({
          reference_month: 1,
          gasto_cartao_centavos: 1,
          gasto_cartao_formatado: 1,
          nr_conta: 1,
          _id: 0,
        })
        .lean()
        .exec(),
    ]);

    const spendingMap = new Map<
      string,
      Array<{
        reference_month?: string;
        gasto_cartao_centavos?: number;
        gasto_cartao_formatado?: string;
      }>
    >();
    for (const item of spendings) {
      if (!spendingMap.has(item.nr_conta)) spendingMap.set(item.nr_conta, []);
      spendingMap.get(item.nr_conta)!.push({
        reference_month: item.reference_month,
        gasto_cartao_centavos: item.gasto_cartao_centavos,
        gasto_cartao_formatado: item.gasto_cartao_formatado,
      });
    }

    return accounts.map((account) => ({
      nr_conta: account.nr_conta,
      nome_completo: account.nome_completo,
      credit_card_spending_history: this.groupCreditCardSpendingByYear(
        spendingMap.get(account.nr_conta) || [],
      ),
    }));
  }

  private async updateRequest(body: {
    id: string;
    status?: WebhookSenderRequestStatus;
    webhook_url_sent?: string;
    upload_url?: string;
    signed_url?: string;
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
          { data: signed_url, type: WebhookModuleType.CREDIT_CARD_SPENDING },
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

  private async generateZipFromPayload(payload: unknown) {
    const jsonPayload = JSON.stringify(payload);
    await fs.writeFile(this.filePath, jsonPayload);

    const zipFile = await this.storageUploadUtilsService.zipFile(this.filePath);
    await fs.unlink(this.filePath);
    return zipFile;
  }

  private formatReferenceMonth(value?: string): string | null {
    if (!value || typeof value !== 'string') return null;
    const match = value.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;

    const year = match[1];
    const monthIndex = Number(match[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) return null;

    const months = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];

    return `${months[monthIndex]}/${year.slice(-2)}`;
  }

  private groupCreditCardSpendingByYear(
    creditCardSpendingHistory?: Array<{
      reference_month?: string;
      gasto_cartao_centavos?: number;
      gasto_cartao_formatado?: string;
      [key: string]: any;
    }>,
  ) {
    const sorted = (creditCardSpendingHistory || [])
      .slice()
      .sort((a, b) =>
        String(a?.reference_month || '').localeCompare(
          String(b?.reference_month || ''),
        ),
      )
      .map((item) => ({
        ...item,
        reference_month_formatted: this.formatReferenceMonth(
          item?.reference_month,
        ),
      }));

    const groups = new Map<string, any[]>();

    for (const item of sorted) {
      const year = this.extractYearFromReferenceMonth(item?.reference_month);
      if (!year) continue;
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year)?.push(item);
    }

    return Array.from(groups.entries()).map(([year, items]) => ({
      year,
      items,
    }));
  }

  private extractYearFromReferenceMonth(value?: string): string | null {
    if (!value || typeof value !== 'string') return null;
    const match = value.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    return match[1];
  }
}
