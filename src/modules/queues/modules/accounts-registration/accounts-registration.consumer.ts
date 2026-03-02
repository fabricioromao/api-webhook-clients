import { HttpService } from '@nestjs/axios';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { createWriteStream } from 'fs';
import * as fs from 'fs/promises';
import { Parser } from 'json2csv';
import { Model } from 'mongoose';
import { join } from 'path';
import { lastValueFrom } from 'rxjs';

import {
  Accounts,
  CustomerEngagement,
  QueuesEnum,
  StorageUploadUtilsService,
  WebhookModuleType,
  WebhookSenderRequests,
  WebhookSenderRequestStatus,
} from 'src/shared';
import { AccountsRegistrationDto } from 'src/shared/dto';
import { formatDate } from 'src/shared/utils';

@Processor(QueuesEnum.ACCOUNTS_REGISTRATION)
export class AccountsRegistrationConsumer extends WorkerHost {
  private logger = new Logger(AccountsRegistrationConsumer.name);

  private filePath = join(process.cwd(), 'clients_registration.csv');
  private readonly batchSize = 500;

  constructor(
    @InjectModel(WebhookSenderRequests.name)
    private webhookSenderRequestsModel: Model<WebhookSenderRequests>,
    @InjectModel(Accounts.name)
    private accountsModel: Model<Accounts>,
    @InjectModel(CustomerEngagement.name)
    private customerEngagementModel: Model<CustomerEngagement>,

    private readonly storageUploadUtilsService: StorageUploadUtilsService,
    private readonly http: HttpService,
  ) {
    super();
  }

  async process(job: Job<AccountsRegistrationDto>) {
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
            'request_params.module_type': WebhookModuleType.CLIENT_REGISTRATION,
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

      const zipFile = await this.generateCsvFromCollections();

      const uploadUrl = await this.storageUploadUtilsService.uploadToStorage({
        apiKey,
        filePath: zipFile,
        referenceDate,
      });

      const signedUrl =
        await this.storageUploadUtilsService.signedUrlWithExpiration(
          this.storageUploadUtilsService.getRelativeFilePath(uploadUrl),
        );

      // delete the local file after upload
      await fs.unlink(zipFile);

      await this.updateRequest({
        id,
        upload_url: uploadUrl,
        signed_url: signedUrl,
      });

      return await this.sendToSenderWebhook({
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
      const webhookUrl = await this.resolveWebhookUrl({
        requestId: job.data.id,
        webhookUrl: job.data.webhookUrl,
      });
      await this.notifyErrorToSenderWebhook({
        requestId: job.data.id,
        webhook_url: webhookUrl,
        message: error.message,
      });
    }
  }

  async generateCsvFromCollections() {
    const accountsCursor = this.accountsModel
      .find()
      .select({
        nr_conta: 1,
        nome_completo: 1,
        email: 1,
        documento_cpf_cnpj: 1,
        tipo_cliente: 1,
        dt_nascimento: 1,
        celular: 1,
        profissao: 1,
        estado_civil: 1,
        endereco_completo: 1,
        endereco_complemento: 1,
        endereco_cidade: 1,
        endereco_estado: 1,
        endereco_cep: 1,
        dt_abertura: 1,
        dt_encerramento: 1,
        dt_vinculo: 1,
        dt_primeiro_investimento: 1,
        dt_ultimo_investimento: 1,
        status: 1,
        genero: 1,
        perfil_investidor: 1,
        tipo_investidor: 1,
        suitability: 1,
        faixa_cliente: 1,
        nm_officer: 1,
        cge_officer: 1,
        _id: 0,
      })
      .lean()
      .cursor({ batchSize: this.batchSize });

    const output = createWriteStream(this.filePath);

    const parser = new Parser({
      fields: this.fields(),
      quote: '"',
      header: false,
    });

    // header
    await this.writeWithBackpressure(output, this.fields().join(',') + '\n');

    const accountsBatch: Accounts[] = [];
    const seenAccounts = new Set<string>();
    let duplicatedAccounts = 0;
    let invalidAccounts = 0;

    for await (const account of accountsCursor) {
      const accountNumber = this.normalizeAccountNumber(account.nr_conta);
      if (!accountNumber) {
        invalidAccounts++;
        continue;
      }

      if (seenAccounts.has(accountNumber)) {
        duplicatedAccounts++;
        continue;
      }

      seenAccounts.add(accountNumber);
      accountsBatch.push({
        ...(account as Accounts),
        nr_conta: accountNumber,
      });

      if (accountsBatch.length >= this.batchSize) {
        await this.writeAccountsBatch({
          accountsBatch,
          parser,
          output,
        });
        accountsBatch.length = 0;
      }
    }

    if (accountsBatch.length) {
      await this.writeAccountsBatch({
        accountsBatch,
        parser,
        output,
      });
    }

    if (duplicatedAccounts || invalidAccounts) {
      this.logger.warn(
        `Accounts Registration: duplicadas ignoradas=${duplicatedAccounts}, sem nr_conta=${invalidAccounts}`,
      );
    }

    await new Promise<void>((resolve, reject) => {
      output.on('finish', resolve);
      output.on('error', reject);
      output.end();
    });

    const zipFile = await this.storageUploadUtilsService.zipFile(this.filePath);
    await fs.unlink(this.filePath);
    return zipFile;
  }

  async updateRequest(body: {
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

  async sendToSenderWebhook(data: {
    requestId: string;
    webhook_url: string;
    signed_url: string;
  }) {
    const { webhook_url, signed_url, requestId } = data;

    try {
      await lastValueFrom(
        this.http.post(
          webhook_url,
          { data: signed_url, type: WebhookModuleType.CLIENT_REGISTRATION },
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
      await this.updateRequest({
        id: requestId,
        status: WebhookSenderRequestStatus.FAILED,
        error_api: error.message,
        webhook_url_sent: webhook_url,
      });
      await this.notifyErrorToSenderWebhook({
        requestId,
        webhook_url,
        message: error.message,
      });
      return null;
    }
  }

  private async resolveWebhookUrl(params: {
    requestId: string;
    webhookUrl?: string;
  }): Promise<string | undefined> {
    if (params.webhookUrl) return params.webhookUrl;

    const request = await this.webhookSenderRequestsModel
      .findById(params.requestId)
      .select('sender.webhook_url')
      .lean()
      .exec();

    return request?.sender?.webhook_url;
  }

  private async notifyErrorToSenderWebhook(params: {
    requestId: string;
    webhook_url?: string;
    message: string;
  }) {
    if (!params.webhook_url) {
      this.logger.warn(
        `Webhook URL não encontrada para notificar erro da solicitação ${params.requestId}`,
      );
      return;
    }

    try {
      await lastValueFrom(
        this.http.post(
          params.webhook_url,
          {
            type: WebhookModuleType.CLIENT_REGISTRATION,
            status: 'error',
            error: params.message,
          },
          {
            validateStatus: (status) => status === 200 || status === 201,
          },
        ),
      );
    } catch (notifyError) {
      this.logger.error(
        `Falha ao notificar erro para webhook ${params.webhook_url}: ${notifyError.message}`,
      );
    }
  }

  private fields(): string[] {
    return [
      'nr_conta',
      'nome_completo',
      'email',
      'documento_cpf_cnpj',
      'tipo_cliente',
      'dt_nascimento',
      'celular',
      'profissao',
      'estado_civil',
      'endereco_completo',
      'endereco_complemento',
      'endereco_cidade',
      'endereco_estado',
      'endereco_cep',
      'dt_abertura',
      'dt_encerramento',
      'dt_vinculo',
      'dt_primeiro_investimento',
      'dt_ultimo_investimento',
      'status',
      'genero',
      'perfil_investidor',
      'tipo_investidor',
      'suitability',
      'faixa_cliente',
      'nm_assessor',
      'cge_code',
      'cge_officer',
      'nivel_engajamento',
      'explicacao_engajamento',
    ];
  }

  private normalizeAccountNumber(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  private async writeAccountsBatch(params: {
    accountsBatch: Accounts[];
    parser: Parser<any>;
    output: NodeJS.WritableStream;
  }) {
    const { accountsBatch, parser, output } = params;
    const cpfCnpjList = [
      ...new Set(
        accountsBatch
          .map((account) => account.documento_cpf_cnpj)
          .filter((value) => value),
      ),
    ];

    const engagementDocs = await this.customerEngagementModel
      .find({ cpf_cnpj: { $in: cpfCnpjList } })
      .select({
        cpf_cnpj: 1,
        nivel_engajamento: 1,
        explicacao_engajamento: 1,
        _id: 0,
      })
      .lean()
      .exec();

    const engagementMap = new Map(
      engagementDocs.map((e) => [e.cpf_cnpj, e]),
    );

    for (const account of accountsBatch) {
      const engagement = engagementMap.get(account.documento_cpf_cnpj);
      const row = {
        nr_conta: account.nr_conta,
        nome_completo: account.nome_completo,
        email: account.email,
        documento_cpf_cnpj: account.documento_cpf_cnpj,
        tipo_cliente: account.tipo_cliente,
        dt_nascimento: account.dt_nascimento,
        celular: account.celular,
        profissao: account.profissao,
        estado_civil: account.estado_civil,
        endereco_completo: account.endereco_completo,
        endereco_complemento: account.endereco_complemento,
        endereco_cidade: account.endereco_cidade,
        endereco_estado: account.endereco_estado,
        endereco_cep: account.endereco_cep,
        dt_abertura: account.dt_abertura ? formatDate(account.dt_abertura) : '',
        dt_encerramento: account.dt_encerramento
          ? formatDate(account.dt_encerramento)
          : '',
        dt_vinculo: account.dt_vinculo ? formatDate(account.dt_vinculo) : '',
        dt_primeiro_investimento: account.dt_primeiro_investimento
          ? formatDate(account.dt_primeiro_investimento)
          : '',
        dt_ultimo_investimento: account.dt_ultimo_investimento
          ? formatDate(account.dt_ultimo_investimento)
          : '',
        status: account.status,
        genero: account.genero,
        perfil_investidor: account.perfil_investidor,
        tipo_investidor: account.tipo_investidor,
        suitability: account.suitability,
        faixa_cliente: account.faixa_cliente,
        nm_assessor: account.nm_officer,
        cge_code: account.cge_officer,
        cge_officer: account.cge_officer,
        nivel_engajamento: engagement?.nivel_engajamento || '',
        explicacao_engajamento: engagement?.explicacao_engajamento || '',
      };

      await this.writeWithBackpressure(output, parser.parse([row]) + '\n');
    }
  }

  private async writeWithBackpressure(
    output: NodeJS.WritableStream,
    data: string,
  ) {
    if (output.write(data)) return;
    await new Promise<void>((resolve) => output.once('drain', resolve));
  }
}
