import { Module } from '@nestjs/common';
import { AccountsMarketingConsumer } from './modules/accounts-marketing/accounts-marketing.consumer';

@Module({
  imports: [],
  controllers: [],
  providers: [AccountsMarketingConsumer],
})
export class QueuesModule {}
