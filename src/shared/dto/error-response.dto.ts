import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Indica que a operação falhou',
    example: false,
  })
  success = false;

  @ApiProperty({
    description: 'Mensagem de erro detalhando o que aconteceu',
    example: 'API Key é obrigatória',
  })
  message: string = 'Erro interno no servidor';

  constructor(error: { message: string; statusCode?: number }) {
    Object.assign(this, error);
  }
}
