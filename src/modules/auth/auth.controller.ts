import { Controller, Get, Req, Res } from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { IsPublic, ResponseHandlerService } from 'src/shared';
import { AuthTokenResponseDto, ErrorResponseDto } from 'src/shared/dto';
import { GenerateTokenUseCase } from './uses-cases/generate-token.use-case';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly responseHandlerService: ResponseHandlerService,
    private readonly generateTokenUseCase: GenerateTokenUseCase,
  ) {}

  @IsPublic()
  @Get('token')
  @ApiOperation({
    summary: 'Gerar token de autenticação JWT',
    description:
      'Gera um token JWT para autenticação nos demais endpoints da API. O fluxo de autenticação é: 1. Forneça sua API Key no header api-key, 2. Receba um token JWT válido por 5 minutos, 3. Use este token no header Authorization como Bearer <token>. Importante: O token expira em 5 minutos, gere um novo token quando necessário e mantenha sua API Key segura.',
  })
  @ApiSecurity('api-key')
  @ApiHeader({
    name: 'api-key',
    description: 'API Key fornecida pelo sistema para identificação do cliente',
    required: true,
    schema: {
      type: 'string',
      example: 'your-api-key-here',
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token JWT gerado com sucesso',
    type: AuthTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'API Key não fornecida ou inválida',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
    type: ErrorResponseDto,
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
