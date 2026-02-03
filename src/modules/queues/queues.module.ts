import { Module } from '@nestjs/common';
import { AccountsMarketingModule } from './modules/accounts-marketing/accounts-marketing.module';
import { AccountsRegistrationModule } from './modules/accounts-registration/accounts-registration.module';
import { AccountsAssetsModule } from './modules/accounts-assets/accounts-assets.module';
import { CreditCardSpendingModule } from './modules/credit-card-spending/credit-card-spending.module';

@Module({
  imports: [
    AccountsMarketingModule,
    AccountsRegistrationModule,
    CreditCardSpendingModule,
    AccountsAssetsModule,
  ],
  controllers: [],
  providers: [],
})
export class QueuesModule {}
