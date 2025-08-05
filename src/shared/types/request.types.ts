import { Request } from 'express';
import { WebhookSenderConfig } from '../schemas';

export type RequestType = Request & {
  sender: WebhookSenderConfig;
};
