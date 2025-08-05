import { Module } from '@nestjs/common';
import { AudioConsumer } from './modules/accounts/accounts.consumer';

@Module({
  imports: [],
  controllers: [],
  providers: [AudioConsumer],
})
export class QueuesModule {}
