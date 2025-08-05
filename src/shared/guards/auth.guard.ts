import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IS_PUBLIC_KEY } from '../decorators/isPublic.decorator';
import { WebhookSenderConfig } from '../schemas';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly jwtService: JwtService,
    @InjectModel(WebhookSenderConfig.name)
    private readonly webhookSenderConfigModel: Model<WebhookSenderConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      // Ignora chamadas que não sejam HTTP (ex: RabbitMQ, WebSocket etc.)
      return true;
    }
    const request = context.switchToHttp().getRequest();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getClass(),
      context.getHandler(),
    ]);
    if (isPublic) return true;

    const token = request.headers['authorization'];

    if (!token) throw new UnauthorizedException('Token não fornecido');

    try {
      const sender = await this.webhookSenderConfigModel.findOne({
        _id: this.jwtService.decode(token.replace('Bearer ', ''))._id,
      });

      if (!sender)
        throw new UnauthorizedException('Token inválido ou expirado');

      request.sender = sender;

      return true;
    } catch (error) {
      throw new UnauthorizedException(
        error?.message || 'Token inválido ou expirado',
      );
    }
  }
}
