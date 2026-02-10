export class CommissionPerClientDto {
  id: string;
  apiKey: string;
  referenceDate: string;
  webhookUrl?: string;

  constructor(partial: Partial<CommissionPerClientDto>) {
    Object.assign(this, partial);
  }
}
