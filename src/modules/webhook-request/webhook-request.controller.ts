import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ResponseHandlerService } from 'src/shared';
import type { RequestType } from 'src/shared/types/request.types';
import { RequestAccountsMarketingUseCase } from './use-cases/request-accounts-marketing.use-case';
import { RequestAccountsRegistrationUseCase } from './use-cases/request-accounts-registration.use-case';
import { RequestCreditCardSpendingUseCase } from './use-cases/request-credit-card-spending.use-case';

@ApiTags('Solicitações de Webhook')
@Controller('webhook-request')
export class WebhookRequestController {
  constructor(
    private readonly responseHandlerService: ResponseHandlerService,
    private readonly requestAccountsMarketingUseCase: RequestAccountsMarketingUseCase,
    private readonly requestAccountsRegistrationUseCase: RequestAccountsRegistrationUseCase,
    private readonly requestCreditCardSpendingUseCase: RequestCreditCardSpendingUseCase,
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
      '  "data": "https://.../clients_marketing_2024-08-07_api123.zip"',
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
      '| profissao | string | Profissão informada pelo cliente. |',
      '| estado_civil | string | Estado civil cadastrado. |',
      '| estado | string | UF de residência. |',
      '| cidade | string | Cidade de residência. |',
      '| dt_vinculo | string | Data de vínculo com a corretora (DD/MM/YYYY). |',
      '| dt_vinculo_escritorio | string | Data de vínculo com o escritório (DD/MM/YYYY). |',
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
      '  \"data\": \"https://.../clients_registration_2024-08-07_api123.zip\"',
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
      '| dt_abertura | string | Data de abertura da conta (DD/MM/YYYY). |',
      '| dt_encerramento | string | Data de encerramento da conta (DD/MM/YYYY). |',
      '| dt_vinculo | string | Data de vínculo com a corretora (DD/MM/YYYY). |',
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
  async requestAccountsRegistration(@Res() res: Response, @Req() req: RequestType) {
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
      'Solicita os gastos de cartão de crédito por conta e envia o JSON diretamente para o webhook cadastrado.',
      '',
      '### Payload enviado ao webhook',
      'Quando o processamento terminar, enviamos um POST para a URL cadastrada com o JSON abaixo:',
      '',
      '```json',
      '{',
      '  \"data\": [',
      '    {',
      '      \"nr_conta\": \"003838135\",',
      '      \"nome_completo\": \"HELIO DE SOUSA PERES\",',
      '      \"credit_card_spending_history\": [',
      '        {',
      '          \"year\": \"2024\",',
      '          \"items\": [',
      '            {',
      '              \"reference_month\": \"2024-01\",',
      '              \"reference_month_formatted\": \"Jan/24\",',
      '              \"gasto_cartao_centavos\": 123456,',
      '              \"gasto_cartao_formatado\": \"R$ 1.234,56\"',
      '            }',
      '          ]',
      '        }',
      '      ]',
      '    }',
      '  ]',
      '}',
      '```',
      '',
      '### Estrutura do JSON entregue',
      '| Campo | Tipo | Descrição |',
      '| --- | --- | --- |',
      '| data | array | Lista de contas com histórico de gastos. |',
      '| data[].nr_conta | string | Número da conta do cliente. |',
      '| data[].nome_completo | string | Nome completo cadastrado. |',
      '| data[].credit_card_spending_history | array | Histórico agrupado por ano. |',
      '| data[].credit_card_spending_history[].year | string | Ano de referência (YYYY). |',
      '| data[].credit_card_spending_history[].items | array | Lista de gastos por mês. |',
      '| data[].credit_card_spending_history[].items[].reference_month | string | Mês de referência (YYYY-MM). |',
      '| data[].credit_card_spending_history[].items[].reference_month_formatted | string | Mês formatado (ex.: Jan/24). |',
      '| data[].credit_card_spending_history[].items[].gasto_cartao_centavos | number | Valor em centavos. |',
      '| data[].credit_card_spending_history[].items[].gasto_cartao_formatado | string | Valor formatado em moeda. |',
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
  async requestCreditCardSpending(@Res() res: Response, @Req() req: RequestType) {
    return await this.responseHandlerService.handle({
      method: async () => {
        return await this.requestCreditCardSpendingUseCase.execute(req);
      },
      res,
      successMessage: 'Solicitação de dados enviada com sucesso.',
    });
  }
}
