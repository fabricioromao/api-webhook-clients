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
    description: 'Solicita os dados das contas através de um webhook',
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
    });
  }
}
