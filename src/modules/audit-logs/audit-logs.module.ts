import { Module } from '@nestjs/common';
import { AuditLogsQueryController } from './controllers/audit-logs.controller';
import { AuditLogQueryService } from './services/audit-log-query.service';

@Module({
  controllers: [AuditLogsQueryController],
  providers: [AuditLogQueryService],
})
export class AuditLogQueryModule {}
