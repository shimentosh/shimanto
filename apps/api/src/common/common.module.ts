import { Global, Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { TurnstileService } from './turnstile.service.js';

/** Shared services every feature module can inject. */
@Global()
@Module({
  providers: [AuditService, TurnstileService],
  exports: [AuditService, TurnstileService],
})
export class CommonModule {}
