import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type WebhookSenderConfigDocument = HydratedDocument<WebhookSenderConfig>;

@Schema({ collection: 'webhook_sender_config', timestamps: true })
export class WebhookSenderConfig extends Document {
  @Prop()
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  api_key: string;

  @Prop({ required: true, unique: true })
  webhook_url: string;

  @Prop()
  webhook_secret: string;

  @Prop({
    required: true,
    type: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },
  })
  owner: {
    name: string;
    email: string;
    phone: string;
  };

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const WebhookSenderConfigSchema =
  SchemaFactory.createForClass(WebhookSenderConfig);

WebhookSenderConfigSchema.index({ api_key: 1 });
