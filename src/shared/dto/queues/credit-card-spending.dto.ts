export class CreditCardSpendingDto {
  id: string;
  apiKey: string;
  referenceDate: string;
  webhookUrl?: string;

  constructor(partial: Partial<CreditCardSpendingDto>) {
    Object.assign(this, partial);
  }
}
