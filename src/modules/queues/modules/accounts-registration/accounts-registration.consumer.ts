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
    }
  }

  async generateCsvFromCollections() {
    const accountsCursor = this.accountsModel
      .find()
      .lean()
      .cursor({ batchSize: 1_000 });

    const output = createWriteStream(this.filePath);

    const parser = new Parser({
      fields: this.fields(),
      quote: '"',
      header: false,
    });

    const engagementDocs = await this.customerEngagementModel.find().lean();
    const engagementMap = new Map(
      engagementDocs.map((e) => [e.cpf_cnpj, e]),
    );

    // header
    output.write(this.fields().join(',') + '\n');

    for await (const account of accountsCursor) {
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

      output.write(parser.parse([row]) + '\n');
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
      return await this.updateRequest({
        id: requestId,
        status: WebhookSenderRequestStatus.FAILED,
        error_api: error.message,
        webhook_url_sent: webhook_url,
      });
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
}
