import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WebhookModuleType } from '../enum';

export function formatDate(
  date: string | Date,
  formatStyle = 'dd/MM/yyyy',
): string {
  return format(new Date(date), formatStyle, { locale: ptBR });
}

export function resolveWebhookUrl(
  sender: {
    webhook_urls?: Record<string, string>;
    webhook_url?: string;
  },
  moduleType: WebhookModuleType,
): string | null {
  const moduleUrl = sender?.webhook_urls?.[moduleType];
  if (moduleUrl) return moduleUrl;
  if (sender?.webhook_url) return sender.webhook_url;
  return null;
}
