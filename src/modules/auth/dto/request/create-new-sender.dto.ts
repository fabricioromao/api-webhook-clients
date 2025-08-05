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
    description: 'URL do webhook',
    example: 'https://example.com/webhook',
  })
  @IsNotEmpty()
  @IsUrl()
  webhook_url: string;
}
