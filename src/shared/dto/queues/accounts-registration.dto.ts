export class AccountsRegistrationDto {
  id: string;
  apiKey: string;
  referenceDate: string;
  webhookUrl?: string;

  constructor(partial: Partial<AccountsRegistrationDto>) {
    Object.assign(this, partial);
  }
}
