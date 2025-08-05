import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type WebhookSenderConfigDocument = HydratedDocument<WebhookSenderConfig>;

@Schema({ collection: 'webhook_sender_config', timestamps: true })
export class WebhookSenderConfig extends Document {
  @Prop()
  name: string;

  @Prop()
  api_key: string;

  @Prop()
  webhook_url: string;

  @Prop()
  webhook_secret: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const WebhookSenderConfigSchema =
  SchemaFactory.createForClass(WebhookSenderConfig);

WebhookSenderConfigSchema.index({ api_key: 1 });
