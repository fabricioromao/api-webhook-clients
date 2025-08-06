import { Module } from '@nestjs/common';
import { AccountsMarketingModule } from './modules/accounts-marketing/accounts-marketing.module';

@Module({
  imports: [AccountsMarketingModule],
  controllers: [],
  providers: [],
})
export class QueuesModule {}
