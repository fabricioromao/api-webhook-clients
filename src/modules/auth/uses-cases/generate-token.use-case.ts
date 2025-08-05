import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebhookSenderConfig } from 'src/shared';

@Injectable()
export class GenerateTokenUseCase {
  constructor(
    @InjectModel(WebhookSenderConfig.name)
    private webhookSenderConfigModel: Model<WebhookSenderConfig>,
    private jwtService: JwtService,
  ) {}

  async execute(apiKey) {
    if (!apiKey) {
      throw new BadRequestException('API Key é obrigatória');
    }
    const sender = await this.webhookSenderConfigModel
      .findOne({
        api_key: apiKey,
      })
      .select('_id')
      .lean()
      .exec();

    if (!sender) {
      throw new BadRequestException('Api key inválida');
    }

    const payload = {
      _id: sender._id,
    };

    return {
      token: await this.jwtService.signAsync(payload),
    };
  }
}
