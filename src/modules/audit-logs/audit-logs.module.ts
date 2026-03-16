import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '@/infrastructure/audit/entities/audit-log.entity';
import { AuditLogsQueryController } from './controllers/audit-logs.controller';
import { AuditLogQueryService } from './services/audit-log-query.service';
import { AuditLogsRepository } from '@/database/sql/repositories/audit-logs.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogsQueryController],
  providers: [AuditLogQueryService, AuditLogsRepository],
  exports: [AuditLogsRepository],
})
export class AuditLogQueryModule {}
