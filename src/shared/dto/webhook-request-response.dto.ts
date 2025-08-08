import { ApiProperty } from '@nestjs/swagger';

export class WebhookRequestResponseDto {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Dados retornados (null para solicitações de webhook)',
    example: null,
    nullable: true,
  })
  data: null;

  @ApiProperty({
    description: 'Mensagem de confirmação da solicitação',
    example: 'Solicitação de dados enviada com sucesso.',
  })
  message: string;
}
