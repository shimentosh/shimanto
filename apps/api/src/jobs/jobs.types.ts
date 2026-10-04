/** Every background job and its payload. Add a job here and a handler in JobsModule. */
export interface JobMap {
  'mail.send': {
    to: string;
    subject: string;
    text: string;
    html?: string;
    replyTo?: string;
    /** EmailEvent to mark SENT / FAILED (transactional email). */
    eventId?: string;
  };
  'web.revalidate': { tags: string[] };
  /** Create and run the deliveries of a paid / $0 order. Idempotent. */
  'fulfillment.run': { orderId: string };
  'analytics.deliver': { eventId: string };
}
export type JobName = keyof JobMap;
export type JobHandler<K extends JobName> = (data: JobMap[K]) => Promise<void>;
/** Handlers provided when the jobs module boots; feature modules register the rest at init. */
export type JobHandlers = Partial<{ [K in JobName]: JobHandler<K> }>;

/** Enqueue background work. BullMQ in dev/prod; inline (in-process) in tests and tooling. */
export abstract class JobsService {
  protected readonly registered = new Map<JobName, (data: unknown) => Promise<void>>();

  abstract enqueue<K extends JobName>(name: K, data: JobMap[K]): Promise<void>;

  /** Feature modules register their handlers in onModuleInit (avoids module import cycles). */
  register<K extends JobName>(name: K, handler: JobHandler<K>): void {
    this.registered.set(name, handler as (data: unknown) => Promise<void>);
  }

  protected handlerFor(
    base: JobHandlers,
    name: JobName,
  ): ((data: unknown) => Promise<void>) | undefined {
    return (
      (base[name] as ((data: unknown) => Promise<void>) | undefined) ?? this.registered.get(name)
    );
  }
}

export const JOB_HANDLERS = Symbol('JOB_HANDLERS');
