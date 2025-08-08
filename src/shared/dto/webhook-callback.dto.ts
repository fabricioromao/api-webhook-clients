import { ApiProperty } from '@nestjs/swagger';

export class WebhookDataPayloadDto {
  @ApiProperty({
    description: 'URL assinada para download dos dados (válida por 15 minutos)',
    example:
      'https://storage.googleapis.com/bucket/clients_marketing_2024-08-07_api123.zip?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=service%40project.iam.gserviceaccount.com%2F20240807%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20240807T140000Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=abc123...',
  })
  data: string;
}
