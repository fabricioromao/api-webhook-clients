import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ResponseHandlerService } from 'src/shared';
import type { RequestType } from 'src/shared/types/request.types';
import { RequestAccountsAssetsUseCase } from './use-cases/request-accounts-assets.use-case';
import { RequestAccountsMarketingUseCase } from './use-cases/request-accounts-marketing.use-case';
import { RequestAccountsRegistrationUseCase } from './use-cases/request-accounts-registration.use-case';
import { RequestCommissionPerClientUseCase } from './use-cases/request-commission-per-client.use-case';
import { RequestCreditCardSpendingUseCase } from './use-cases/request-credit-card-spending.use-case';

@ApiTags('Solicitações de Webhook')
@Controller('webhook-request')
export class WebhookRequestController {
  constructor(
    private readonly responseHandlerService: ResponseHandlerService,
    private readonly requestAccountsMarketingUseCase: RequestAccountsMarketingUseCase,
    private readonly requestAccountsRegistrationUseCase: RequestAccountsRegistrationUseCase,
    private readonly requestCreditCardSpendingUseCase: RequestCreditCardSpendingUseCase,
    private readonly requestAccountsAssetsUseCase: RequestAccountsAssetsUseCase,
    private readonly requestCommissionPerClientUseCase: RequestCommissionPerClientUseCase,
  ) {}

  @Get('accounts-marketing')
  @ApiOperation({
    summary: 'Marketing',
    description: [
      'Solicita os dados das contas através de um webhook e documenta o que será entregue quando o processamento for concluído.',
      '',
      '### Payload enviado ao webhook',
      'Quando o processamento terminar, enviamos um POST para a URL cadastrada contendo um link temporário para download do arquivo:',
      '',
      '```json',
      '{',
      '  "data": "https://.../clients_marketing_2024-08-07_api123.zip",',
      '  "type": "client_marketing"',
      '}',
      '```',
      '',
      'O link expira em 15 minutos e aponta para um arquivo .zip com a planilha CSV.',
      '',
      '### Estrutura do arquivo CSV entregue',
      '| Campo | Tipo | Descrição |',
      '| --- | --- | --- |',
      '| nr_conta | string | Número da conta do cliente. |',
      '| nome_completo | string | Nome completo cadastrado. |',
      '| email | string | Endereço de e-mail principal. |',
      '| documento_cpf_cnpj | string | CPF/CNPJ sem máscara. |',
      '| tier | string | Classificação de tier calculada a partir do PL. |',
      '| score | number | Score associado ao tier. |',
      '| dt_nascimento | string | Data de nascimento no formato DD/MM/YYYY. |',
      '| idade | number | Idade calculada a partir da data de nascimento. |',
      '| celular | string | Número de celular principal. |',
      '| nm_assessor | string | Nome do assessor vinculado à conta. |',
      '| codigo_assessor | string | Código do assessor vinculado à conta. |',
      '| tipo_cliente | string | Tipo de cliente (PF, PJ). |',
      '| status | string | Status da conta. |',
      '| profissao | string | Profissão informada pelo cliente. |',
      '| estado_civil | string | Estado civil cadastrado. |',
      '| estado | string | UF de residência. |',
      '| cidade | string | Cidade de residência. |',
      '| dt_vinculo | string | Data que o cliente se vinculou a outro assessor dentro do escritório (DD/MM/YYYY). |',
      '| dt_vinculo_escritorio | string | Quando o cliente entrou na base do escritório (DD/MM/YYYY). |',
      '| perfil_investidor | string | Perfil de investidor (ex.: Conservador). |',
      '| faixa_cliente | string | Segmento/faixa do cliente. |',
      '| dt_primeiro_investimento | string | Data do primeiro investimento (DD/MM/YYYY). |',
      '| pl_conta_corrente | number | Patrimônio líquido em conta corrente. |',
      '| pl_total | number | Patrimônio líquido total. |',
      '| pl_fundos | number | Saldo aplicado em fundos. |',
      '| pl_renda_fixa | number | Saldo aplicado em renda fixa. |',
      '| pl_renda_variavel | number | Saldo aplicado em renda variável. |',
      '| pl_previdencia | number | Saldo aplicado em previdência. |',
      '| pl_derivativos | number | Saldo aplicado em derivativos. |',
      '| pl_crypto | number | Saldo aplicado em criptoativos (PL crypto). |',
      '| pl_valores_transito | number | Saldo de valores em trânsito. |',
      '| rendimento_anual | number | Rendimento anual. |',
      '| pl_declarado | number | Patrimônio declarado pelo cliente. |',
      '| genero | string | Gênero informado. |',
      '| suitability | string | Perfil Investidor. |',
      '| termo_consentimento | string | Status do termo de consentimento do banking. |',
      '| cartao | string | Cartão contratado. |',
      '| saldo_banking | string | Saldo disponível no banking. |',
      '| prog_relacionamento | string | Programa de relacionamento vigente. |',
      '| seguro_vida | string | Situação do seguro de vida. |',
      '| seguro_conta_cartao | string | Situação do seguro conta/cartão. |',
      '| seguro_prestamista | string | Situação do seguro prestamista. |',
      '| portabilidade | string | Informações sobre portabilidade ativa. |',
      '| value_open_finance | number | Somatório dos PLs provenientes de Open Finance. |',
      '| limite_padrao_pre_aprovado | string | Limite padrão pré-aprovado (cartão). |',
      '| limite_lastreado_pre_aprovado | string | Limite lastreado pré-aprovado. |',
      '| limite_padrao_contratado | string | Limite padrão contratado. |',
      '| limite_lastreado_contratado | string | Limite lastreado contratado. |',
      '| pais_residencia | string | País de residência (Brasil ou Fora). |',
      '| ja_aportou | string | Indica se o cliente já realizou aporte (Sim/Não). |',
      '| percentual_fundos | number | Percentual do PL alocado em fundos (0-100). |',
      '| percentual_renda_fixa | number | Percentual do PL em renda fixa (0-100). |',
      '| percentual_renda_variavel | number | Percentual do PL em renda variável (0-100). |',
      '| percentual_previdencia | number | Percentual do PL em previdência (0-100). |',
      '| percentual_derivativos | number | Percentual do PL em derivativos (0-100). |',
      '',
      '> Campos  podem ser nulos ou 0 quando não houver informação disponível.',
    ].join('\n'),
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token para autenticação',
    required: true,
    schema: { type: 'string' },
  })
  async requestAccounts(@Res() res: Response, @Req() req: RequestType) {
    return await this.responseHandlerService.handle({
      method: async () => {
        return await this.requestAccountsMarketingUseCase.execute(req);
      },
      res,
      successMessage: 'Solicitação de dados enviada com sucesso.',
    });
  }

  @Get('accounts-registration')
  @ApiOperation({
    summary: 'Dados cadastrais com engajamento',
    description: [
      'Solicita os dados cadastrais das contas através de um webhook e documenta o que será entregue quando o processamento for concluído.',
      '',
      '### Payload enviado ao webhook',
      'Quando o processamento terminar, enviamos um POST para a URL cadastrada contendo um link temporário para download do arquivo:',
      '',
      '```json',
      '{',
      '  \"data\": \"https://.../clients_registration_2024-08-07_api123.zip\",',
      '  \"type\": \"client_registration\"',
      '}',
      '```',
      '',
      'O link expira em 15 minutos e aponta para um arquivo .zip com a planilha CSV.',
      '',
      '### Estrutura do arquivo CSV entregue',
      '| Campo | Tipo | Descrição |',
      '| --- | --- | --- |',
      '| nr_conta | string | Número da conta do cliente. |',
      '| nome_completo | string | Nome completo cadastrado. |',
      '| email | string | E-mail principal. |',
      '| documento_cpf_cnpj | string | CPF/CNPJ sem máscara. |',
      '| tipo_cliente | string | Tipo de cliente (PF, PJ). |',
      '| dt_nascimento | string | Data de nascimento informada pelo cliente. |',
      '| celular | string | Celular principal. |',
      '| profissao | string | Profissão informada. |',
      '| estado_civil | string | Estado civil informado. |',
      '| endereco_completo | string | Endereço completo cadastrado. |',
      '| endereco_complemento | string | Complemento do endereço. |',
      '| endereco_cidade | string | Cidade de residência. |',
      '| endereco_estado | string | UF de residência. |',
      '| endereco_cep | string | CEP de residência. |',
      '| dt_abertura | string | Quando o cliente abriu a conta (DD/MM/YYYY). |',
      '| dt_encerramento | string | Data de encerramento da conta (DD/MM/YYYY). |',
      '| dt_vinculo | string | Data que o cliente se vinculou a outro assessor dentro do escritório (DD/MM/YYYY). |',
      '| dt_primeiro_investimento | string | Data do primeiro investimento (DD/MM/YYYY). |',
      '| dt_ultimo_investimento | string | Data do último investimento (DD/MM/YYYY). |',
      '| status | string | Status da conta. |',
      '| genero | string | Gênero informado. |',
      '| perfil_investidor | string | Perfil de investidor. |',
      '| tipo_investidor | string | Tipo de investidor. |',
      '| suitability | string | Perfil de suitability. |',
      '| faixa_cliente | string | Segmento/faixa do cliente (ex.: Até 50K). |',
      '| nm_assessor | string | Nome do assessor vinculado. |',
      '| cge_code | number | Código do assessor (mesmo valor de cge_officer). |',
      '| cge_officer | number | Código do assessor (cge_officer). |',
      '| nivel_engajamento | string | Nível de engajamento (customer_engagement). |',
      '| explicacao_engajamento | string | Explicação do nível de engajamento. |',
      '',
      '> Campos podem ser nulos ou vazios quando não houver informação disponível.',
    ].join('\n'),
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token para autenticação',
    required: true,
    schema: { type: 'string' },
  })
  async requestAccountsRegistration(
    @Res() res: Response,
    @Req() req: RequestType,
  ) {
    return await this.responseHandlerService.handle({
      method: async () => {
        return await this.requestAccountsRegistrationUseCase.execute(req);
      },
      res,
      successMessage: 'Solicitação de dados enviada com sucesso.',
    });
  }

  @Get('credit-card-spending')
  @ApiOperation({
    summary: 'Cartão de crédito',
    description: [
      'Solicita os gastos de cartão de crédito por conta e envia um link para download do JSON em arquivo .zip.',
      '',
      '### Payload enviado ao webhook',
      'Quando o processamento terminar, enviamos um POST para a URL cadastrada contendo um link temporário para download do arquivo:',
      '',
      '```json',
      '{',
      '  \"data\": \"https://.../credit_card_spending.json.zip\",',
      '  \"type\": \"credit_card_spending\"',
      '}',
      '```',
      '',
      'O link expira em 15 minutos e aponta para um arquivo .zip com um único arquivo JSON.',
      '',
      '### Estrutura do JSON entregue',
      '| Campo | Tipo | Descrição |',
      '| --- | --- | --- |',
      '| (root) | array | Lista de contas com histórico de gastos. |',
      '| (root)[].nr_conta | string | Número da conta do cliente. |',
      '| (root)[].nome_completo | string | Nome completo cadastrado. |',
      '| (root)[].credit_card_spending_history | array | Histórico agrupado por ano. |',
      '| (root)[].credit_card_spending_history[].year | string | Ano de referência (YYYY). |',
      '| (root)[].credit_card_spending_history[].items | array | Lista de gastos por mês. |',
      '| (root)[].credit_card_spending_history[].items[].reference_month | string | Mês de referência (YYYY-MM). |',
      '| (root)[].credit_card_spending_history[].items[].reference_month_formatted | string | Mês formatado (ex.: Jan/24). |',
      '| (root)[].credit_card_spending_history[].items[].gasto_cartao_centavos | number | Valor em centavos. |',
      '| (root)[].credit_card_spending_history[].items[].gasto_cartao_formatado | string | Valor formatado em moeda. |',
      '',
      '> Contas sem histórico de gasto retornam o array credit_card_spending_history vazio.',
    ].join('\n'),
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token para autenticação',
    required: true,
    schema: { type: 'string' },
  })
  async requestCreditCardSpending(
    @Res() res: Response,
    @Req() req: RequestType,
  ) {
    return await this.responseHandlerService.handle({
      method: async () => {
        return await this.requestCreditCardSpendingUseCase.execute(req);
      },
      res,
      successMessage: 'Solicitação de dados enviada com sucesso.',
    });
  }

  @Get('accounts-assets')
  @ApiOperation({
    summary: 'Contas por ativo',
    description: [
      'Solicita os ativos das contas e envia um link para download do JSON em arquivo .zip.',
      '',
      '### Parâmetros opcionais',
      '- `assets`: permite filtrar quais ativos serão retornados. Aceita múltiplos valores.',
      '',
      'Valores aceitos:',
      '- `all` (padrão)',
      '- `fundos`',
      '- `renda_fixa`',
      '- `previdencia`',
      '- `renda_variavel`',
      '- `cripto`',
      '- `valores_em_transito`',
      '',
      'Exemplos:',
      '- `/webhook-request/accounts-assets?assets=fundos&assets=renda_fixa`',
      '- `/webhook-request/accounts-assets?assets=renda_variavel,cripto`',
      '',
      '### Payload enviado ao webhook',
      'Quando o processamento terminar, enviamos um POST para a URL cadastrada contendo um link temporário para download do arquivo:',
      '',
      '```json',
      '{',
      '  \"data\": \"https://.../accounts_assets.json.zip\",',
      '  \"type\": \"account_assets\"',
      '}',
      '```',
      '',
      'O link expira em 15 minutos e aponta para um arquivo .zip com um único arquivo JSON.',
      '',
      '### Estrutura do JSON entregue',
      '| Campo | Tipo | Descrição |',
      '| --- | --- | --- |',
      '| (root) | array | Lista de contas com ativos. |',
      '| (root)[].nr_conta | string | Número da conta do cliente. |',
      '| (root)[].nome_completo | string | Nome completo cadastrado. |',
      '| (root)[].ativos | object | Ativos do cliente, formatados como no get-customer-by-id. |',
      '| (root)[].ativos.investment_fund | array | Fundos (quando solicitado). |',
      '| (root)[].ativos.fixed_income | array | Renda fixa (quando solicitado). |',
      '| (root)[].ativos.pension_informations | array | Previdência (quando solicitado). |',
      '| (root)[].ativos.pending_settlements | object | Valores em trânsito (quando solicitado). |',
      '| (root)[].ativos.stock_positions | array | Renda variável (quando solicitado). |',
      '| (root)[].ativos.equities_derivatives | array | Derivativos de renda variável (quando solicitado). |',
      '| (root)[].ativos.crypto_coin | array | Criptoativos (quando solicitado). |',
      '| (root)[].ativos.cash | array | Caixa/cash (somente em `all`). |',
      '| (root)[].ativos.summary_accounts | array | Resumo por mercado (somente em `all`). |',
      '',
      '> Campos não solicitados não serão retornados.',
    ].join('\n'),
  })
  @ApiQuery({
    name: 'assets',
    required: false,
    isArray: true,
    description:
      'Filtro de ativos. Aceita múltiplos valores: all, fundos, renda_fixa, previdencia, renda_variavel, cripto, valores_em_transito.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token para autenticação',
    required: true,
    schema: { type: 'string' },
  })
  async requestAccountsAssets(
    @Res() res: Response,
    @Req() req: RequestType,
    @Query('assets') assets?: string | string[],
  ) {
    const normalizedAssets = this.normalizeAssetsQuery(assets);

    return await this.responseHandlerService.handle({
      method: async () => {
        return await this.requestAccountsAssetsUseCase.execute(
          req,
          normalizedAssets,
        );
      },
      res,
      successMessage: 'Solicitação de dados enviada com sucesso.',
    });
  }

  @Get('commission-per-client')
  @ApiOperation({
    summary: 'Receita Mensal',
    description: [
      'Solicita o arquivo mensal de receitas e envia um link assinado temporário ao webhook do integrador.',
      '',
      '### Parâmetro obrigatório',
      '- `referenceMonth`: mês/ano no formato `YYYY-MM`.',
      '',
      '### Regras',
      '- O arquivo mensal correspondente deve existir no bucket.',
      '- Se o arquivo não existir, a API retorna erro e não cria envio.',
      '',
      '### Payload enviado ao webhook',
      'Quando o processamento terminar, enviamos um POST para a URL cadastrada contendo um link temporário para download do arquivo:',
      '',
      '```json',
      '{',
      '  "data": "https://...signed-url...",',
      '  "type": "commission_per_client"',
      '}',
      '```',
      '',
      'A URL enviada ao integrador é sempre assinada e expira em 15 minutos.',
      '',
      '### Estrutura do JSON dentro do ZIP',
      '| Campo | Tipo | Descrição |',
      '| --- | --- | --- |',
      '| data_competencia | string (date) | Data de competência (UTC). |',
      '| data_receita | string (date) | Data de receita (UTC). |',
      '| nr_conta | string | Número da conta. |',
      '| nome_completo | string | Nome completo do cliente. |',
      '| cge_officer | number | Código do assessor. |',
      '| nm_officer | string | Nome do assessor. |',
      '| categoria | string | Categoria da receita/comissão. |',
      '| produto | string | Produto. |',
      '| ativo | string | Ativo. |',
      '| codigo_produto | string | Código do produto. |',
      '| certificado_apolice | string \\| null | Certificado/apólice, quando houver. |',
      '| tipo_receita | string | Tipo da receita. |',
      '| receita_bruta | number | Receita bruta. |',
      '| receita_liquida | number | Receita líquida. |',
      '| comissao | number | Valor de comissão. |',
    ].join('\n'),
  })
  @ApiQuery({
    name: 'referenceMonth',
    required: true,
    description: 'Mês de referência no formato YYYY-MM.',
    schema: { type: 'string', example: '2025-10' },
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token para autenticação',
    required: true,
    schema: { type: 'string' },
  })
  async requestCommissionPerClient(
    @Res() res: Response,
    @Req() req: RequestType,
    @Query('referenceMonth') referenceMonth: string,
  ) {
    const normalizedDate = this.normalizeReferenceMonth(referenceMonth);

    return await this.responseHandlerService.handle({
      method: async () => {
        return await this.requestCommissionPerClientUseCase.execute(
          req,
          normalizedDate,
        );
      },
      res,
      successMessage: 'Solicitação de dados enviada com sucesso.',
    });
  }

  private normalizeAssetsQuery(assets?: string | string[]) {
    if (!assets) return undefined;
    const raw = Array.isArray(assets) ? assets : [assets];
    const normalized = raw
      .flatMap((value) => String(value).split(','))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const allowed = new Set([
      'all',
      'fundos',
      'renda_fixa',
      'previdencia',
      'renda_variavel',
      'cripto',
      'valores_em_transito',
    ]);

    const invalid = normalized.filter((value) => !allowed.has(value));
    if (invalid.length) {
      throw new BadRequestException(
        `Tipos de ativos inválidos: ${invalid.join(', ')}`,
      );
    }

    return normalized.length ? normalized : undefined;
  }

  private normalizeReferenceMonth(referenceMonth?: string): string {
    const value = String(referenceMonth || '').trim();
    const isFormatValid = /^\d{4}-\d{2}$/.test(value);
    if (!isFormatValid) {
      throw new BadRequestException(
        'Parâmetro referenceMonth inválido. Use o formato YYYY-MM.',
      );
    }

    const parsed = new Date(`${value}-01T00:00:00.000Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 7) !== value
    ) {
      throw new BadRequestException(
        'Parâmetro referenceMonth inválido. Use um mês válido no formato YYYY-MM.',
      );
    }

    return `${value}-01`;
  }
}
