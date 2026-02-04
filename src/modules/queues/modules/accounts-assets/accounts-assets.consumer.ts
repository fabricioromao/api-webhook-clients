import { HttpService } from '@nestjs/axios';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { createWriteStream } from 'fs';
import * as fs from 'fs/promises';
import { format as formatDateFn } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Model } from 'mongoose';
import { join } from 'path';
import { lastValueFrom } from 'rxjs';

import {
  Accounts,
  PositionsByAccount,
  QueuesEnum,
  StorageUploadUtilsService,
  WebhookModuleType,
  WebhookSenderRequests,
  WebhookSenderRequestStatus,
} from 'src/shared';
import { AccountsAssetsDto } from 'src/shared/dto';

const ASSET_TYPES = new Set([
  'all',
  'fundos',
  'renda_fixa',
  'previdencia',
  'renda_variavel',
  'cripto',
  'valores_em_transito',
]);

type AssetType =
  | 'all'
  | 'fundos'
  | 'renda_fixa'
  | 'previdencia'
  | 'renda_variavel'
  | 'cripto'
  | 'valores_em_transito';

@Processor(QueuesEnum.ACCOUNTS_ASSETS)
export class AccountsAssetsConsumer extends WorkerHost {
  private logger = new Logger(AccountsAssetsConsumer.name);
  private filePath = join(process.cwd(), 'accounts_assets.json');
  private batchSize = 500;

  constructor(
    @InjectModel(WebhookSenderRequests.name)
    private webhookSenderRequestsModel: Model<WebhookSenderRequests>,
    @InjectModel(Accounts.name)
    private accountsModel: Model<Accounts>,
    @InjectModel(PositionsByAccount.name)
    private positionsByAccountModel: Model<PositionsByAccount>,

    private readonly storageUploadUtilsService: StorageUploadUtilsService,
    private readonly http: HttpService,
  ) {
    super();
  }

  async process(job: Job<AccountsAssetsDto>) {
    try {
      const { id, apiKey, referenceDate, webhookUrl, assetTypes } = job.data;

      this.logger.debug(`Processando solicitação: ${id}`);

      if (!webhookUrl) {
        throw new Error('Webhook URL não fornecida');
      }

      const normalizedTypes = this.normalizeAssetTypes(assetTypes).sort();

      const [existingRequest, currentRequest] = await Promise.all([
        this.webhookSenderRequestsModel
          .findOne({
            'sender.api_key': apiKey,
            reference_date: referenceDate,
            'request_params.module_type': WebhookModuleType.ACCOUNT_ASSETS,
            'request_params.asset_types': normalizedTypes,
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

      const zipFile = await this.generateZipFromPositions(normalizedTypes);

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

  private normalizeAssetTypes(types?: string[]): AssetType[] {
    if (!types?.length) return ['all'];
    const normalized = types
      .flatMap((value) => String(value).split(','))
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value && ASSET_TYPES.has(value));
    return normalized.length ? (normalized as AssetType[]) : ['all'];
  }

  private async generateZipFromPositions(assetTypes: AssetType[]) {
    const output = createWriteStream(this.filePath);
    output.write('[');

    let first = true;
    let batch: Array<{ nr_conta: string; nome_completo: string }> = [];

    const accountsCursor = this.accountsModel
      .find()
      .select({ nr_conta: 1, nome_completo: 1, _id: 0 })
      .lean()
      .cursor({ batchSize: this.batchSize });

    for await (const account of accountsCursor) {
      batch.push({
        nr_conta: account.nr_conta,
        nome_completo: account.nome_completo,
      });

      if (batch.length >= this.batchSize) {
        ({ first } = await this.processBatch({
          batch,
          output,
          first,
          assetTypes,
        }));
        batch = [];
      }
    }

    if (batch.length) {
      ({ first } = await this.processBatch({
        batch,
        output,
        first,
        assetTypes,
      }));
    }

    output.write(']');

    await new Promise<void>((resolve, reject) => {
      output.on('finish', resolve);
      output.on('error', reject);
      output.end();
    });

    const zipFile = await this.storageUploadUtilsService.zipFile(this.filePath);
    await fs.unlink(this.filePath);
    return zipFile;
  }

  private async processBatch({
    batch,
    output,
    first,
    assetTypes,
  }: {
    batch: Array<{ nr_conta: string; nome_completo: string }>;
    output: ReturnType<typeof createWriteStream>;
    first: boolean;
    assetTypes: AssetType[];
  }) {
    const accountNumbers = batch
      .map((account) => account.nr_conta)
      .filter((value) => value);

    const positions = await this.positionsByAccountModel
      .aggregate([
        { $match: { account_number: { $in: accountNumbers } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$account_number', doc: { $first: '$$ROOT' } } },
      ])
      .allowDiskUse(true)
      .exec();

    const positionsMap = new Map(
      positions.map((item) => [item._id, item.doc as PositionsByAccount]),
    );

    for (const account of batch) {
      const positionsByAccount = positionsMap.get(account.nr_conta);
      const ativos = this.formatAssets(positionsByAccount, assetTypes);

      const payload = {
        nr_conta: account.nr_conta,
        nome_completo: account.nome_completo,
        ativos,
      };

      output.write(`${first ? '' : ','}${JSON.stringify(payload)}`);
      first = false;
    }

    return { first };
  }

  private formatAssets(
    positionsByAccount: PositionsByAccount | undefined,
    assetTypes: AssetType[],
  ) {
    const includeAll = assetTypes.includes('all');
    const includes = (type: AssetType) => includeAll || assetTypes.includes(type);

    const assets: Record<string, any> = {};

    if (includes('fundos')) {
      assets.investment_fund =
        positionsByAccount?.investment_fund?.map((fund) => {
          const net_asset_value = fund.acquisition.reduce(
            (sum, acc) => sum + Number(acc.net_asset_value || 0),
            0,
          );

          return {
            share_value: this.formatCurrency(fund.share_value),
            fund_name: fund.fund.fund_name,
            date_portfolio: fund.fund.date_portfolio
              ? this.formatDate(fund.fund.date_portfolio)
              : 'Sem informação',
            net_asset_value,
            net_asset_value_formatted: this.formatCurrency(net_asset_value),
            fund_cnpj: this.formatCpfCnpj(fund.fund.fund_c_n_p_j_code),
            fund_liquidity: fund.fund.fund_liquidity,
          };
        }) || [];
    }

    if (includes('renda_fixa')) {
      assets.fixed_income =
        positionsByAccount?.fixed_income?.map((income) => ({
          issuer: income.issuer,
          maturity_date: income.maturity_date
            ? this.formatDate(income.maturity_date)
            : 'Sem informação',
          gross_value: this.formatCurrency(income.gross_value),
          net_value: this.formatCurrency(income.net_value),
          product: income.accounting_group_code,
          index_yield_rate: income.index_yield_rate,
        })) || [];
    }

    if (includes('previdencia')) {
      assets.pension_informations =
        positionsByAccount?.pension_informations?.map((pension) => ({
          fund_type: pension.fund_type,
          certificate_name: pension.certificate_name,
          certificate_status: pension.certificate_status,
          tax_regime: pension.tax_regime,
          income_type: pension.income_type,
          gross_value: this.formatCurrency(pension.gross_value),
          net_value: this.formatCurrency(pension.net_value),
          cost_price: this.formatCurrency(pension.cost_price),
          start_date: pension?.start_date
            ? this.formatDate(pension.start_date)
            : 'Sem informação',
          first_contribution_date: pension?.first_contribution_date
            ? this.formatDate(pension.first_contribution_date)
            : 'Sem informação',
          positions:
            pension.positions?.map((position) => ({
              fund_name: position.fund_name,
              gross_asset_value: this.formatCurrency(
                position.gross_asset_value,
              ),
            })) || [],
        })) || [];
    }

    if (includes('valores_em_transito')) {
      assets.pending_settlements = {
        fixed_income:
          positionsByAccount?.pending_settlements?.[0]?.fixed_income?.map(
            (income) => ({
              ...income,
              financial_value: this.formatCurrency(income.financial_value),
              settlement_date: income?.maturity_date
                ? this.formatDate(income.maturity_date)
                : 'Sem informação',
            }),
          ) || [],
        investment_fund:
          positionsByAccount?.pending_settlements?.[0]?.investment_fund?.map(
            (fund) => ({
              ...fund,
              financial_value: this.formatCurrency(fund.financial_value),
              settlement_date: fund?.settlement_date
                ? this.formatDate(fund.settlement_date)
                : 'Sem informação',
            }),
          ) || [],
        equities:
          positionsByAccount?.pending_settlements?.[0]?.equities?.map(
            (equity) => ({
              ticker: equity.ticker,
              description: equity.description,
              financial_value: this.formatCurrency(equity.financial_value),
              settlement_date: equity.settlement_date
                ? this.formatDate(equity.settlement_date)
                : 'Sem informação',
              transaction: equity.transaction,
            }),
          ) || [],
        derivative:
          positionsByAccount?.pending_settlements?.[0]?.derivative?.map(
            (derivative) => ({
              ...derivative,
              financial_value: this.formatCurrency(derivative.financial_value),
              settlement_date: derivative?.settlement_date
                ? this.formatDate(derivative.settlement_date)
                : 'Sem informação',
            }),
          ) || [],
        pension:
          positionsByAccount?.pending_settlements?.[0]?.pension?.map(
            (pension) => ({
              ...pension,
              financial_value: this.formatCurrency(pension.financial_value),
              settlement_date: pension.settlement_date
                ? this.formatDate(pension.settlement_date)
                : 'Sem informação',
            }),
          ) || [],
        others:
          positionsByAccount?.pending_settlements?.[0]?.others?.map((other) => ({
            ...other,
            financial_value: this.formatCurrency(other.financial_value),
            settlement_date: other.settlement_date
              ? this.formatDate(other.settlement_date)
              : 'Sem informação',
          })) || [],
      };
    }

    if (includes('renda_variavel')) {
      assets.stock_positions =
        positionsByAccount?.equities?.[0]?.stock_positions?.map((stock) => ({
          ticker: stock.ticker,
          quantity: stock.quantity,
          market_price: this.formatCurrency(stock.market_price),
          gross_value: this.formatCurrency(stock.gross_value),
          average_price: this.formatCurrency(stock.average_price.price),
          price_variation: this.calculateStockPositionVariation({
            averagePrice: parseFloat(stock.average_price.price),
            marketPrice: parseFloat(stock.market_price),
          }),
        })) || [];

      assets.equities_derivatives =
        positionsByAccount?.equities?.[0]?.option_positions?.map((option) => ({
          ticker: option.ticker,
          buy_sell: option.buy_sell,
          quantity: option.quantity,
          strike_price: option.strike_price,
          maturity_date: this.formatDate(option.maturity_date),
          option_type: option.option_type,
        })) || [];
    }

    if (includes('cripto')) {
      assets.crypto_coin =
        positionsByAccount?.crypto_coin?.map((crypto) => ({
          name: crypto.asset.name,
          quantity: crypto.quantity,
          financial: this.formatCurrency(crypto.financial),
          cost_basis: this.formatCurrency(crypto.cost_basis),
          position_date: this.formatDate(crypto.position_date),
          market_price: this.formatCurrency(crypto.market_price),
        })) || [];
    }

    if (includeAll) {
      assets.cash =
        positionsByAccount?.cash?.map((cash) => ({
          current_account_value: this.formatCurrency(
            cash.current_account.value,
          ),
          position_date: this.formatDate(cash.current_account.position_date),
          cash_collateral: cash.cash_collateral?.map((collateral) => ({
            description: collateral.collateral_description,
            value: this.formatCurrency(collateral.financial_value),
          })),
          cash_invested: cash.cash_invested?.map((investment) => ({
            name: investment.name.nome,
            acquisition_date: this.formatDate(investment.acquisition_date),
            net_value: this.formatCurrency(investment.net_value),
            gross_value: this.formatCurrency(investment.gross_value),
            maturity_date: this.formatDate(investment.maturity_date),
          })),
        })) || [];

      assets.summary_accounts =
        positionsByAccount?.summary_accounts?.map((account) => ({
          market_name: account.market_name,
          market_abbreviation: account.market_abbreviation,
          position_date: this.formatDate(account.position_date),
          end_position_value: this.toNumber(account.end_position_value),
          end_position_value_formatted: this.formatCurrency(
            account.end_position_value,
          ),
        })) || [];
    }

    return assets;
  }

  private formatDate(value: Date | string): string {
    if (!value) return 'Sem informação';
    return formatDateFn(new Date(value), 'dd/MM/yyyy', { locale: ptBR });
  }

  private formatCurrency(value: number | string): string {
    if (value === null || value === undefined || value === '') value = 0;
    if (typeof value === 'string') value = parseFloat(value);
    if (!Number.isFinite(value as number)) value = 0;

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value as number);
  }

  private formatCpfCnpj(cpfCnpj: string): string {
    if (!cpfCnpj) return '';

    if (cpfCnpj.length === 11) {
      return cpfCnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    return cpfCnpj.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5',
    );
  }

  private calculateStockPositionVariation({
    averagePrice,
    marketPrice,
  }: {
    averagePrice: number;
    marketPrice: number;
  }) {
    if (averagePrice === 0) return '0.00%';

    const data = ((marketPrice - averagePrice) / averagePrice) * 100;

    if (isNaN(data)) return '0.00%';

    return `${data.toFixed(2)}%`;
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
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
          { data: signed_url, type: WebhookModuleType.ACCOUNT_ASSETS },
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
