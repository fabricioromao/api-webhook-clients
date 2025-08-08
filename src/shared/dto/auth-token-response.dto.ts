import { ApiProperty } from '@nestjs/swagger';

export class AuthTokenDataDto {
  @ApiProperty({
    description: 'Token JWT para autenticação',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzYxMjM0NTY3ODkwMWFiY2RlZjEyMzQiLCJpYXQiOjE3MzQyMzQ1NjcsImV4cCI6MTczNDIzNDg2N30.abc123def456',
  })
  token: string;
}

export class AuthTokenResponseDto {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    type: AuthTokenDataDto,
    description: 'Dados do token de autenticação',
  })
  data: AuthTokenDataDto;

  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: null,
    nullable: true,
  })
  message: string | null;
}
