import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { createWriteStream } from 'fs';
import { Parser } from 'json2csv';
import { Model } from 'mongoose';
import { join } from 'path';
import {
  Accounts,
  BankingReports,
  OpenFinance,
  QueuesEnum,
  WebhookSenderRequests,
  WebhookSenderRequestStatus,
} from 'src/shared';

@Processor(QueuesEnum.ACCOUNTS_MARKETING)
export class AccountsMarketingConsumer extends WorkerHost {
  constructor(
    @InjectModel(WebhookSenderRequests.name)
    private webhookSenderRequestsModel: Model<WebhookSenderRequests>,
    @InjectModel(Accounts.name)
    private accountsModel: Model<Accounts>,
    @InjectModel(BankingReports.name)
    private bankingReportsModel: Model<BankingReports>,
    @InjectModel(OpenFinance.name)
    private openFinanceModel: Model<OpenFinance>,
  ) {
    super();
  }

  async process(job: Job<{ id: string }>) {
    const { id } = job.data;

    const request = await this.webhookSenderRequestsModel
      .findById(id)
      .select('webhook_url status')
      .lean()
      .exec();

    if (!request) {
      throw new Error('Solicitação não encontrada com o ID: ' + id);
    }

    if (request.status !== WebhookSenderRequestStatus.PENDING) {
      throw new Error(
        'Solicitação já processada. Status atual: ' + request.status,
      );
    }

    // update request status to PROCESSING

    await this.generateCsvFromCollections();

    // upload to drive and share the link with expiration (15min)

    // update request with upload_url and status COMPLETED

    return {};
  }

  async generateCsvFromCollections() {
    const accountsCursor = this.accountsModel.find().lean().cursor();

    const output = createWriteStream(
      join(process.cwd(), 'clients_marketing.csv'),
    );

    const parserWithHeader = new Parser({ fields: this.fields() });
    const parserWithoutHeader = new Parser({
      fields: this.fields(),
      header: false,
    });

    const [bankingReports, openFinances] = await Promise.all([
      this.bankingReportsModel.find().lean(),
      this.openFinanceModel.find().lean(),
    ]);

    const bankingMap = new Map(bankingReports.map((b) => [b.nr_conta, b]));

    const financeMap = new Map<string, OpenFinance[]>();

    for (const f of openFinances) {
      if (!financeMap.has(f.nr_conta)) financeMap.set(f.nr_conta, []);

      financeMap?.get(f.nr_conta)?.push(f);
    }

    output.write(parserWithHeader.parse([{}]) + '\n');

    for await (const account of accountsCursor) {
      const banking = bankingMap.get(account.nr_conta);
      const openFinance = financeMap.get(account.nr_conta) || [];

      const idade = account.dt_nascimento_date
        ? Math.floor(
            (Date.now() - new Date(account.dt_nascimento_date).getTime()) /
              (1000 * 60 * 60 * 24 * 365.25),
          )
        : null;

      const row = {
        nr_conta: account.nr_conta,
        nome_completo: account.nome_completo,
        email: account.email,
        documento_cpf_cnpj: account.documento_cpf_cnpj,
        dt_nascimento: account.dt_nascimento,
        idade,
        tipo_cliente: account.tipo_cliente,
        profissao: account.profissao,
        estado_civil: account.estado_civil,
        estado: account.endereco_estado,
        cidade: account.endereco_cidade,
        dt_vinculo: account.dt_vinculo,
        dt_vinculo_escritorio: account.dt_vinculo_escritorio,
        perfil_investidor: account.perfil_investidor,
        faixa_cliente: account.faixa_cliente,
        dt_primeiro_investimento: account.dt_primeiro_investimento,
        pl_conta_corrente: account.pl_conta_corrente,
        pl_total: account.pl_total,
        pl_fundos: account.pl_fundos,
        pl_renda_fixa: account.pl_renda_fixa,
        pl_renda_variavel: account.pl_renda_variavel,
        pl_previdencia: account.pl_previdencia,
        pl_derivativos: account.pl_derivativos,
        rendimento_anual: account.vl_rendimento_anual,
        pl_declarado: account.vl_pl_declarado,
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
          (acc, o) => acc + (o.vl_pl || 0),
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
        percentual_fundos: account.pl_total
          ? ((account.pl_fundos || 0) / account.pl_total) * 100
          : 0,
        percentual_renda_fixa: account.pl_total
          ? ((account.pl_renda_fixa || 0) / account.pl_total) * 100
          : 0,
        percentual_renda_variavel: account.pl_total
          ? ((account.pl_renda_variavel || 0) / account.pl_total) * 100
          : 0,
        percentual_previdencia: account.pl_total
          ? ((account.pl_previdencia || 0) / account.pl_total) * 100
          : 0,
        percentual_derivativos: account.pl_total
          ? ((account.pl_derivativos || 0) / account.pl_total) * 100
          : 0,
      };

      output.write(parserWithoutHeader.parse([row]) + '\n');
    }

    output.end();
  }

  private fields(): string[] {
    return [
      'nr_conta',
      'nome_completo',
      'email',
      'documento_cpf_cnpj',
      'dt_nascimento',
      'idade',
      'tipo_cliente',
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
