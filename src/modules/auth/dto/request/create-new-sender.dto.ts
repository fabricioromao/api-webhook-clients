import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';

export class CreateNewSenderDto {
  @ApiProperty({
    description: 'Nome do remetente do webhook',
    example: 'Webhook Sender',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Descrição do remetente do webhook',
    example: 'Envio de dados de marketing via webhook',
  })
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'URL do webhook',
    example: 'https://example.com/webhook',
  })
  @IsNotEmpty()
  @IsUrl()
  webhook_url: string;

  @ApiProperty({
    description: 'Informações do proprietário do webhook',
    example: {
      name: 'Owner Name',
      email: 'owner@example.com',
      phone: '1234567890',
    },
  })
  owner: {
    name: string;
    email: string;
    phone: string;
  };
}
