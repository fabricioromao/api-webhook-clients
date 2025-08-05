import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { IsPublic, ResponseHandlerService } from 'src/shared';
import { GenerateTokenUseCase } from './uses-cases/generate-token.use-case';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly responseHandlerService: ResponseHandlerService,
    private readonly generateTokenUseCase: GenerateTokenUseCase,
  ) {}

  // TODO: API KEY no header

  @IsPublic()
  @Get('token')
  @ApiOperation({
    summary: 'Gerar token de autenticação',
    description: 'Gera um token JWT para autenticação',
  })
  @ApiHeader({
    name: 'api-key',
    description: 'API Key fornecida pelo sistema',
    required: true,
    schema: { type: 'string' },
  })
  async getToken(@Res() res: Response, @Req() req: Request) {
    return await this.responseHandlerService.handle({
      method: async () => {
        return await this.generateTokenUseCase.execute(req.headers['api-key']);
      },
      res,
    });
  }
}

// webhook_sender_requests: criar antes de mandar para a fila,
//retornar um requestId: Uuid
