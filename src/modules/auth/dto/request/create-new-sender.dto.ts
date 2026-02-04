import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsUrl } from 'class-validator';

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
    description: 'URLs de webhook por módulo',
    example: {
      account_assets: 'https://accassets.ngrok.app',
      credit_card_spending: 'https://ccspnd.ngrok.app',
      client_registration: 'https://clntreg.ngrok.app',
      client_marketing: 'https://clntsmkt.ngrok.app',
    },
  })
  @IsNotEmpty()
  @IsObject()
  webhook_urls: {
    account_assets?: string;
    credit_card_spending?: string;
    client_registration?: string;
    client_marketing?: string;
  };

  @ApiProperty({
    description: 'URL de webhook padrão (legado)',
    example: 'https://example.com/webhook',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  webhook_url?: string;

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
