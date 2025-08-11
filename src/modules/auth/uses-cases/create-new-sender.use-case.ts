import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { WebhookSenderConfig } from 'src/shared';
import { CreateNewSenderDto } from '../dto/request/create-new-sender.dto';

@Injectable()
export class CreateNewSenderUseCase implements OnModuleInit {
  constructor(
    @InjectModel(WebhookSenderConfig.name)
    private webhookSenderConfigModel: Model<WebhookSenderConfig>,
  ) {}

  async onModuleInit() {
    // await this.execute({
    //   name: '',
    //   description:
    //     'Envio de dados das contas para o  departamennto de marketing via webhook',
    //   webhook_url: '',
    //   owner: {
    //     name: '',
    //     email: '',
    //     phone: '',
    //   },
    // });
  }

  async execute(body: CreateNewSenderDto) {
    const existingSender = await this.webhookSenderConfigModel
      .findOne({
        webhook_url: body.webhook_url,
      })
      .lean()
      .exec();

    if (existingSender) {
      throw new InternalServerErrorException(
        'Já existe um remetente com esta URL de webhook',
      );
    }

    const apiKey = randomUUID();

    const newSender = await this.webhookSenderConfigModel.create({
      name: body.name,
      api_key: apiKey,
      webhook_url: body.webhook_url,
      webhook_secret: this.generetaWebhookSecret(apiKey),
      owner: body.owner,
      description: body.description,
    });

    if (!newSender) {
      throw new InternalServerErrorException(
        'Ocorreu um erro ao criar o remetente do webhook',
      );
    }

    return;
  }

  private generetaWebhookSecret(apiKey: string): string {
    return require('crypto').createHash('sha256').update(apiKey).digest('hex');
  }
}
