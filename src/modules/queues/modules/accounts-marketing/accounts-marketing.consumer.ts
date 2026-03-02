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
  BankingReports,
  OpenFinance,
  PositionsByAccount,
  QueuesEnum,
  StorageUploadUtilsService,
  WebhookModuleType,
  WebhookSenderRequests,
  WebhookSenderRequestStatus,
} from 'src/shared';
import { AccountsMarketingDto } from 'src/shared/dto';
import { formatDate } from 'src/shared/utils';

@Processor(QueuesEnum.ACCOUNTS_MARKETING)
export class AccountsMarketingConsumer extends WorkerHost {
  private logger = new Logger(AccountsMarketingConsumer.name);

  private filePath = join(process.cwd(), 'clients_marketing.csv');
  private readonly batchSize = 500;

  constructor(
    @InjectModel(WebhookSenderRequests.name)
    private webhookSenderRequestsModel: Model<WebhookSenderRequests>,
    @InjectModel(Accounts.name)
    private accountsModel: Model<Accounts>,
    @InjectModel(BankingReports.name)
    private bankingReportsModel: Model<BankingReports>,
    @InjectModel(OpenFinance.name)
    private openFinanceModel: Model<OpenFinance>,
    @InjectModel(PositionsByAccount.name)
    private positionsByAccountModel: Model<PositionsByAccount>,

    private readonly storageUploadUtilsService: StorageUploadUtilsService,
    private readonly http: HttpService,
  ) {
    super();
  }

  async process(job: Job<AccountsMarketingDto>) {
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
            'request_params.module_type': WebhookModuleType.CLIENT_MARKETING,
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
        dt_nascimento_date: 1,
        dt_nascimento: 1,
        celular: 1,
        nm_officer: 1,
        cge_officer: 1,
        tipo_cliente: 1,
        status: 1,
        profissao: 1,
        estado_civil: 1,
        endereco_estado: 1,
        endereco_cidade: 1,
        dt_vinculo: 1,
        dt_vinculo_escritorio: 1,
        perfil_investidor: 1,
        faixa_cliente: 1,
        dt_primeiro_investimento: 1,
        pl_conta_corrente: 1,
        pl_total: 1,
        pl_fundos: 1,
        pl_renda_fixa: 1,
        pl_renda_variavel: 1,
        pl_previdencia: 1,
        pl_derivativos: 1,
        pl_valores_transito: 1,
        vl_rendimento_anual: 1,
        vl_pl_declarado: 1,
        genero: 1,
        suitability: 1,
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
        `Accounts Marketing: duplicadas ignoradas=${duplicatedAccounts}, sem nr_conta=${invalidAccounts}`,
      );
    }

    // AGORA espere o stream terminar
    await new Promise<void>((resolve, reject) => {
      output.on('finish', resolve);
      output.on('error', reject);
      output.end();
    });

    const zipFile = await this.storageUploadUtilsService.zipFile(this.filePath);
    await fs.unlink(this.filePath);
    return zipFile;
  }

  private async writeAccountsBatch(params: {
    accountsBatch: Accounts[];
    parser: Parser<any>;
    output: NodeJS.WritableStream;
  }) {
    const { accountsBatch, parser, output } = params;
    const accountNumbers = [
      ...new Set(
        accountsBatch.map((account) => account.nr_conta).filter(Boolean),
      ),
    ];

    const [bankingReports, openFinances, cryptoMap] = await Promise.all([
      this.bankingReportsModel
        .find({ nr_conta: { $in: accountNumbers } })
        .lean()
        .exec(),
      this.openFinanceModel
        .find({ nr_conta: { $in: accountNumbers } })
        .lean()
        .exec(),
      this.getLatestCryptoMapByAccounts(accountNumbers),
    ]);

    const bankingMap = new Map(bankingReports.map((b) => [b.nr_conta, b]));
    const financeMap = new Map<string, OpenFinance[]>();
    for (const f of openFinances) {
      if (!financeMap.has(f.nr_conta)) financeMap.set(f.nr_conta, []);
      financeMap.get(f.nr_conta)!.push(f);
    }

    for (const account of accountsBatch) {
      const banking = bankingMap.get(account.nr_conta);
      const openFinance = financeMap.get(account.nr_conta) || [];
      const cryptoCoin = cryptoMap.get(account.nr_conta) || [];
      const plCrypto = Array.isArray(cryptoCoin)
        ? cryptoCoin.reduce(
            (acc, item) => acc + this.toNumber(item?.financial),
            0,
          )
        : 0;

      const idade = account.dt_nascimento_date
        ? Math.floor(
            (Date.now() - new Date(account.dt_nascimento_date).getTime()) /
              (1000 * 60 * 60 * 24 * 365.25),
          )
        : null;

      const { score, tier } = this.getTierAndScoreByPl({
        pl_total: account.pl_total,
      });

      const row = {
        nr_conta: account.nr_conta,
        nome_completo: account.nome_completo,
        email: account.email,
        documento_cpf_cnpj: account.documento_cpf_cnpj,
        tier,
        score,
        dt_nascimento: account.dt_nascimento,
        idade,
        celular: account.celular,
        nm_assessor: account.nm_officer,
        codigo_assessor: account.cge_officer,
        tipo_cliente: account.tipo_cliente,
        status: account.status || '',
        profissao: account.profissao,
        estado_civil: account.estado_civil,
        estado: account.endereco_estado,
        cidade: account.endereco_cidade,
        dt_vinculo: account.dt_vinculo ? formatDate(account.dt_vinculo) : '',
        dt_vinculo_escritorio: account.dt_vinculo_escritorio
          ? formatDate(account.dt_vinculo_escritorio)
          : '',
        perfil_investidor: account.perfil_investidor,
        faixa_cliente: account.faixa_cliente,
        dt_primeiro_investimento: account.dt_primeiro_investimento
          ? formatDate(account.dt_primeiro_investimento)
          : '',
        pl_conta_corrente: this.toNumber(account.pl_conta_corrente),
        pl_total: this.toNumber(account.pl_total),
        pl_fundos: this.toNumber(account.pl_fundos),
        pl_renda_fixa: this.toNumber(account.pl_renda_fixa),
        pl_renda_variavel: this.toNumber(account.pl_renda_variavel),
        pl_previdencia: this.toNumber(account.pl_previdencia),
        pl_derivativos: this.toNumber(account.pl_derivativos),
        pl_crypto: this.toNumber(plCrypto),
        pl_valores_transito: this.toNumber(account.pl_valores_transito),
        rendimento_anual: this.toNumber(account.vl_rendimento_anual),
        pl_declarado: this.toNumber(account.vl_pl_declarado),
        genero: account.genero,
        suitability: account.suitability,
        termo_consentimento: banking?.termo_consentimento || '',
        cartao: banking?.cartao || '',
        saldo_banking: banking?.saldo_banking || '',
        prog_relacionamento: banking?.prog_relacionamento || '',
        seguro_vida: banking?.seguro_vida || '',
        seguro_conta_cartao: banking?.seguro_conta_cartao || '',
        seguro_prestamista: banking?.seguro_prestamista || '',
        portabilidade: banking?.portabilidade || '',
        value_open_finance: openFinance.reduce(
          (acc, o) => acc + this.toNumber(o.vl_pl),
          0,
        ),
        limite_padrao_pre_aprovado: banking?.pap_clean_cartao || '',
        limite_lastreado_pre_aprovado: banking?.pap_lastreado_cartao || '',
        limite_padrao_contratado: banking?.c_clean_cartao || '',
        limite_lastreado_contratado: banking?.c_lastreado_cartao || '',
        pais_residencia: this.estadosBrasil().includes(account.endereco_estado)
          ? 'Brasil'
          : 'Fora',
        ja_aportou: account.dt_primeiro_investimento ? 'Sim' : 'Não',
        percentual_fundos: this.toNumber(account.pl_total)
          ? (this.toNumber(account.pl_fundos) /
              this.toNumber(account.pl_total)) *
            100
          : 0,
        percentual_renda_fixa: this.toNumber(account.pl_total)
          ? (this.toNumber(account.pl_renda_fixa) /
              this.toNumber(account.pl_total)) *
            100
          : 0,
        percentual_renda_variavel: this.toNumber(account.pl_total)
          ? (this.toNumber(account.pl_renda_variavel) /
              this.toNumber(account.pl_total)) *
            100
          : 0,
        percentual_previdencia: this.toNumber(account.pl_total)
          ? (this.toNumber(account.pl_previdencia) /
              this.toNumber(account.pl_total)) *
            100
          : 0,
        percentual_derivativos: this.toNumber(account.pl_total)
          ? (this.toNumber(account.pl_derivativos) /
              this.toNumber(account.pl_total)) *
            100
          : 0,
      };

      await this.writeWithBackpressure(output, parser.parse([row]) + '\n');
    }
  }

  private async getLatestCryptoMapByAccounts(accountNumbers: string[]) {
    if (!accountNumbers.length) return new Map<string, any[]>();

    const latestPositions = await this.positionsByAccountModel
      .aggregate([
        { $match: { account_number: { $in: accountNumbers } } },
        { $sort: { reference_date: -1, createdAt: -1 } },
        {
          $group: {
            _id: '$account_number',
            crypto_coin: { $first: '$crypto_coin' },
          },
        },
        { $project: { _id: 1, crypto_coin: 1 } },
      ])
      .allowDiskUse(true)
      .exec();

    return new Map<string, any[]>(
      latestPositions.map((position) => [
        String(position._id),
        position.crypto_coin || [],
      ]),
    );
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
          { data: signed_url, type: WebhookModuleType.CLIENT_MARKETING },
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
            type: WebhookModuleType.CLIENT_MARKETING,
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

  private getTierAndScoreByPl({ pl_total }: { pl_total: number | null }) {
    if (pl_total === null) return { tier: '', score: 0 };

    if (pl_total > 1_000_000) return { tier: 'T1', score: 1_000 };
    if (pl_total > 801_000) return { tier: 'T2', score: 900 };
    if (pl_total > 501_000) return { tier: 'T3', score: 600 };
    if (pl_total > 301_000) return { tier: 'T4', score: 500 };
    if (pl_total > 101_000) return { tier: 'T5', score: 400 };
    if (pl_total > 51_000) return { tier: 'T6', score: 300 };
    if (pl_total > 1_000) return { tier: 'T7', score: 200 };
    return { tier: 'T8', score: 100 };
  }

  private fields(): string[] {
    return [
      'nr_conta',
      'nome_completo',
      'email',
      'documento_cpf_cnpj',
      'tier',
      'score',
      'dt_nascimento',
      'idade',
      'celular',
      'nm_assessor',
      'codigo_assessor',
      'tipo_cliente',
      'status',
      'profissao',
      'estado_civil',
      'estado',
      'cidade',
      'dt_vinculo',
      'dt_vinculo_escritorio',
      'perfil_investidor',
      'faixa_cliente',
      'dt_primeiro_investimento',
      'pl_conta_corrente',
      'pl_total',
      'pl_fundos',
      'pl_renda_fixa',
      'pl_renda_variavel',
      'pl_previdencia',
      'pl_derivativos',
      'pl_crypto',
      'pl_valores_transito',
      'rendimento_anual',
      'pl_declarado',
      'genero',
      'suitability',
      'termo_consentimento',
      'cartao',
      'saldo_banking',
      'prog_relacionamento',
      'seguro_vida',
      'seguro_conta_cartao',
      'seguro_prestamista',
      'portabilidade',
      'value_open_finance',
      'limite_padrao_pre_aprovado',
      'limite_lastreado_pre_aprovado',
      'limite_padrao_contratado',
      'limite_lastreado_contratado',
      'pais_residencia',
      'ja_aportou',
      'percentual_fundos',
      'percentual_renda_fixa',
      'percentual_renda_variavel',
      'percentual_previdencia',
      'percentual_derivativos',
    ];
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeAccountNumber(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  private async writeWithBackpressure(
    output: NodeJS.WritableStream,
    data: string,
  ) {
    if (output.write(data)) return;
    await new Promise<void>((resolve) => output.once('drain', resolve));
  }

  private estadosBrasil(): string[] {
    return [
      'ACRE',
      'ALAGOAS',
      'AMAPA',
      'AMAZONAS',
      'BAHIA',
      'CEARA',
      'DISTRITO FEDERAL',
      'ESPIRITO SANTO',
      'GOIAS',
      'MARANHAO',
      'MATO GROSSO',
      'MATO GROSSO DO SUL',
      'MINAS GERAIS',
      'PARA',
      'PARAIBA',
      'PARANA',
      'PERNAMBUCO',
      'PIAUI',
      'RIO DE JANEIRO',
      'RIO GRANDE DO NORTE',
      'RIO GRANDE DO SUL',
      'RONDONIA',
      'RORAIMA',
      'SANTA CATARINA',
      'SAO PAULO',
      'SERGIPE',
      'TOCANTINS',
    ];
  }
}

// {
//   "_id": {
//     "$oid": "68c97d38966fe75a3fe590e3"
//   },
//   "sender": {
//     "id": "689360d4a933b2b5ac098333",
//     "name": "Dev",
//     "api_key": "b2d4ec7e-16bd-483a-882f-bc904970e699",
//     "webhook_url": "https://webhook.site/2594e809-ea67-4b98-8cae-9cb9014712f4",
//     "_id": {
//       "$oid": "68c97d38966fe75a3fe590e4"
//     }
//   },
//   "type": "accounts_marketing",
//   "status": "completed",
//   "reference_date": "2025-09-16",
//   "createdAt": {
//     "$date": "2025-09-16T15:07:36.028Z"
//   },
//   "updatedAt": {
//     "$date": "2025-09-16T15:10:06.428Z"
//   },
//   "__v": 0,
//   "signed_url": "https://storage.googleapis.com/galaxyerp/b2d4ec7e-16bd-483a-882f-bc904970e699/2025-09-16/clients_marketing.csv.zip?GoogleAccessId=locness%40methodical-bank-248219.iam.gserviceaccount.com&Expires=1758036304&Signature=aQPh3xfhZd6eWPRVJZ8zkp7xKxYt67YJfLwh9jm%2FMBcx%2B21pGA9JBPqqIBM%2B0%2BKKILZBuXBQ0f2K5yWPhNpXOyHHjdnPjqBpTtqMkzu3WDDOAFwzSxoO%2Bp2%2B2FYltK4yka327rTE7VyzOoLQaUcPd9q%2F3fJa3ZPwP2cHTd3GpWVwPSf0iGWDnGV9Re%2FI8Nw04AKeTDSa8kDN%2Ffm0v0x%2FpUI3JHl38EBWi9vqq9aJpOm6hpnCrBINQuyAxWrF0CCCe9bbIIP%2FjRvVpFOMy6c9tv2cI3sPUPnGT3gw%2BaO%2BfSJSEac0jDrWR1dun%2BZi9H9D630c%2BMORjLttNK4Z3oJ8iA%3D%3D",
//   "upload_url": "https://storage.googleapis.com/galaxyerp/b2d4ec7e-16bd-483a-882f-bc904970e699/2025-09-16/clients_marketing.csv.zip"
// }
