import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import {
  JOB_HANDLERS,
  type JobHandlers,
  type JobMap,
  type JobName,
  JobsService,
} from './jobs.types.js';

const QUEUE = 'shimanto-jobs';

/** BullMQ needs `maxRetriesPerRequest: null` so blocking worker commands never time out. */
function redisConnection(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: null });
}

/**
 * Redis-backed queue with retries (5 attempts, exponential backoff). The worker runs in-process
 * for now; it can move to a separate process without touching callers.
 */
@Injectable()
export class BullmqJobsService extends JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Jobs');
  private queue!: Queue;
  private worker!: Worker;
  private connections: Redis[] = [];

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(JOB_HANDLERS) private readonly handlers: JobHandlers,
  ) {
    super();
  }

  onModuleInit() {
    // Separate connections: the worker blocks on its own while the queue keeps enqueuing.
    this.connections = [redisConnection(this.env.REDIS_URL), redisConnection(this.env.REDIS_URL)];
    const [queueConnection, workerConnection] = this.connections as [Redis, Redis];
    this.queue = new Queue(QUEUE, {
      connection: queueConnection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    });
    this.worker = new Worker(
      QUEUE,
      async (job) => {
        const handler = this.handlerFor(this.handlers, job.name as JobName);
        if (!handler) throw new Error(`No handler for job ${job.name}`);
        await handler(job.data);
      },
      { connection: workerConnection, concurrency: 5 },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.warn(`Job ${job?.name} failed (attempt ${job?.attemptsMade}): ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    await Promise.all(this.connections.map((c) => c.quit().catch(() => undefined)));
  }

  async enqueue<K extends JobName>(name: K, data: JobMap[K]) {
    await this.queue.add(name, data);
  }
}

/**
 * Runs jobs immediately in-process and records them. Used in tests (assert what was sent)
 * and tooling (OpenAPI export) so no Redis is needed. Failures are logged, never thrown:
 * like a real queue, a failed email must not fail the request that caused it.
 */
@Injectable()
export class InlineJobsService extends JobsService {
  private readonly logger = new Logger('Jobs');
  readonly history: Array<{ name: JobName; data: unknown }> = [];

  constructor(@Inject(JOB_HANDLERS) private readonly handlers: JobHandlers) {
    super();
  }

  async enqueue<K extends JobName>(name: K, data: JobMap[K]) {
    this.history.push({ name, data });
    try {
      const handler = this.handlerFor(this.handlers, name);
      if (!handler) throw new Error(`No handler for job ${name}`);
      await handler(data);
    } catch (error) {
      this.logger.warn(`Inline job ${name} failed: ${(error as Error).message}`);
    }
  }
}
