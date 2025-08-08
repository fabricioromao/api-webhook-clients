import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(
  date: string | Date,
  formatStyle = 'dd/MM/yyyy',
): string {
  return format(new Date(date), formatStyle, { locale: ptBR });
}
