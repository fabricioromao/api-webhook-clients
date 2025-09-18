import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ResponseHandlerService } from 'src/shared';
import type { RequestType } from 'src/shared/types/request.types';
import { RequestAccountsMarketingUseCase } from './use-cases/request-accounts-marketing.use-case';

@ApiTags('Solicitações de Webhook')
@Controller('webhook-request')
export class WebhookRequestController {
  constructor(
    private readonly responseHandlerService: ResponseHandlerService,
    private readonly requestAccountsMarketingUseCase: RequestAccountsMarketingUseCase,
  ) {}

  @Get('accounts-marketing')
  @ApiOperation({
    summary: 'Solicitar dados das contas via webhook',
    description: `Solicita os dados das contas através de um webhook e documenta o que será entregue quando o processamento for concluído.

    ### Payload enviado ao webhook
    Quando o processamento terminar, enviamos um POST para a URL cadastrada contendo um link temporário para download do arquivo:

    \`\`\`json
    {
      "data": "https://.../clients_marketing_2024-08-07_api123.zip"
    }
    \`\`\`

    O link expira em 15 minutos e aponta para um arquivo .zip com a planilha CSV.

    ### Estrutura do arquivo CSV entregue
    | Campo | Tipo | Descrição |
    | --- | --- | --- |
    | nr_conta | string | Número da conta do cliente. |
    | nome_completo | string | Nome completo cadastrado. |
    | email | string | Endereço de e-mail principal. |
    | documento_cpf_cnpj | string | CPF/CNPJ sem máscara. |
    | tier | string | Classificação de tier calculada a partir do PL. |
    | score | number | Score associado ao tier. |
    | dt_nascimento | string | Data de nascimento no formato DD/MM/YYYY. |
    | idade | number | Idade calculada a partir da data de nascimento. |
    | tipo_cliente | string | Tipo de cliente (PF, PJ). |
    | profissao | string | Profissão informada pelo cliente. |
    | estado_civil | string | Estado civil cadastrado. |
    | estado | string | UF de residência. |
    | cidade | string | Cidade de residência. |
    | dt_vinculo | string | Data de vínculo com a corretora (DD/MM/YYYY). |
    | dt_vinculo_escritorio | string | Data de vínculo com o escritório (DD/MM/YYYY). |
    | perfil_investidor | string | Perfil de investidor (ex.: Conservador). |
    | faixa_cliente | string | Segmento/faixa do cliente. |
    | dt_primeiro_investimento | string | Data do primeiro investimento (DD/MM/YYYY). |
    | pl_conta_corrente | number | Patrimônio líquido em conta corrente. |
    | pl_total | number | Patrimônio líquido total. |
    | pl_fundos | number | Saldo aplicado em fundos. |
    | pl_renda_fixa | number | Saldo aplicado em renda fixa. |
    | pl_renda_variavel | number | Saldo aplicado em renda variável. |
    | pl_previdencia | number | Saldo aplicado em previdência. |
    | pl_derivativos | number | Saldo aplicado em derivativos. |
    | rendimento_anual | number | Rendimento anual |
    | pl_declarado | number | Patrimônio declarado pelo cliente. |
    | genero | string | Gênero informado. |
    | suitability | string | Resultado do questionário de suitability. |
    | termo_consentimento | string | Status do termo de consentimento do banking. |
    | cartao | string | Cartão contratado. |
    | saldo_banking | string | Saldo disponível no banking. |
    | prog_relacionamento | string | Programa de relacionamento vigente. |
    | seguro_vida | string | Situação do seguro de vida. |
    | seguro_conta_cartao | string | Situação do seguro conta/cartão. |
    | seguro_prestamista | string | Situação do seguro prestamista. |
    | portabilidade | string | Informações sobre portabilidade ativa. |
    | value_open_finance | number | Somatório dos PLs provenientes de Open Finance. |
    | limite_padrao_pre_aprovado | string | Limite padrão pré-aprovado (cartão). |
    | limite_lastreado_pre_aprovado | string | Limite lastreado pré-aprovado. |
    | limite_padrao_contratado | string | Limite padrão contratado. |
    | limite_lastreado_contratado | string | Limite lastreado contratado. |
    | pais_residencia | string | País de residência (Brasil ou Fora). |
    | ja_aportou | string | Indica se o cliente já realizou aporte (Sim/Não). |
    | percentual_fundos | number | Percentual do PL alocado em fundos (0-100). |
    | percentual_renda_fixa | number | Percentual do PL em renda fixa (0-100). |
    | percentual_renda_variavel | number | Percentual do PL em renda variável (0-100). |
    | percentual_previdencia | number | Percentual do PL em previdência (0-100). |
    | percentual_derivativos | number | Percentual do PL em derivativos (0-100). |

    > Campos numéricos podem ser nulos ou 0 quando não houver informação disponível.`,
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
}
