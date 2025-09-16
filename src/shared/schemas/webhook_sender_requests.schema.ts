import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { WebhookSenderRequestStatus, WebhookSenderRequestType } from '../enum';

export type WebhookSenderRequestsDocument =
  HydratedDocument<WebhookSenderRequests>;

@Schema({ collection: 'webhook_sender_requests', timestamps: true })
export class WebhookSenderRequests extends Document {
  @Prop({
    required: true,
    type: {
      id: { type: String, required: true, trim: true },
      name: { type: String, required: true, trim: true },
      api_key: { type: String, required: true, trim: true },
      webhook_url: { type: String, required: true, trim: true },
    },
  })
  sender: {
    id: string;
    name: string;
    api_key: string;
    webhook_url: string;
  };

  @Prop({ required: true })
  type: WebhookSenderRequestType;

  @Prop({ required: true })
  status: WebhookSenderRequestStatus;

  @Prop()
  upload_url: string;

  @Prop()
  signed_url: string;

  @Prop({ required: true })
  reference_date: string;

  @Prop()
  error_api: string;

  @Prop()
  internal_error: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const WebhookSenderRequestsSchema = SchemaFactory.createForClass(
  WebhookSenderRequests,
);

WebhookSenderRequestsSchema.index({ reference_date: -1, 'sender.api_key': 1 });
