export class AccountsMarketingDto {
  id: string;
  apiKey: string;
  referenceDate: string;
  webhookUrl?: string;

  constructor(partial: Partial<AccountsMarketingDto>) {
    Object.assign(this, partial);
  }
}
