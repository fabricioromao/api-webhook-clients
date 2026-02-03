export class AccountsAssetsDto {
  id: string;
  apiKey: string;
  referenceDate: string;
  webhookUrl?: string;
  assetTypes?: string[];

  constructor(partial: Partial<AccountsAssetsDto>) {
    Object.assign(this, partial);
  }
}
