import { type DynamicModule, Global, Module } from '@nestjs/common';
import type { Env } from '../config/env.js';
import { MailService } from '../mail/mail.service.js';
import { RevalidateService } from '../revalidate/revalidate.service.js';
import { BullmqJobsService, InlineJobsService } from './jobs.drivers.js';
import { JOB_HANDLERS, type JobHandlers, JobsService } from './jobs.types.js';

@Global()
@Module({})
export class JobsModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: JobsModule,
      providers: [
        MailService,
        RevalidateService,
        {
          provide: JOB_HANDLERS,
          inject: [MailService, RevalidateService],
          // Feature modules add their own handlers with `JobsService.register` (e.g. fulfillment).
          useFactory: (mail: MailService, revalidate: RevalidateService): JobHandlers => ({
            'mail.send': (data) => mail.send(data),
            'web.revalidate': (data) => revalidate.send(data),
          }),
        },
        {
          provide: JobsService,
          useClass: env.JOBS_DRIVER === 'inline' ? InlineJobsService : BullmqJobsService,
        },
      ],
      exports: [JobsService],
    };
  }
}
