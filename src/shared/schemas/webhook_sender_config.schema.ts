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

  @Prop()
  webhook_url: string;

  @Prop({
    type: {
      account_assets: { type: String, required: false, trim: true },
      commission_per_client: { type: String, required: false, trim: true },
      credit_card_spending: { type: String, required: false, trim: true },
      client_registration: { type: String, required: false, trim: true },
      client_marketing: { type: String, required: false, trim: true },
    },
  })
  webhook_urls: {
    account_assets?: string;
    commission_per_client?: string;
    credit_card_spending?: string;
    client_registration?: string;
    client_marketing?: string;
  };

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
