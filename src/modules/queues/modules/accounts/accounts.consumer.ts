import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueuesEnum } from 'src/shared';

@Processor(QueuesEnum.ACCOUNTS)
export class AudioConsumer extends WorkerHost {
  async process(job: Job<any, any, string>) {
    //   await job.updateProgress(progress);

    return {};
  }
}
