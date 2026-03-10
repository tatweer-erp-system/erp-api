import { Injectable } from '@nestjs/common';
import {
  AuditService as InfraAuditService,
  CreateAuditLogDto,
} from '@/infrastructure/audit/audit.service';
import { AuditLogEntry, AuditAction } from '@/common/interfaces/audit.interface';

@Injectable()
export class SharedAuditService {
  constructor(private readonly auditService: InfraAuditService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.auditService.log(entry as CreateAuditLogDto);
  }

  async logCreate(
    tenantSlug: string,
    module: string,
    recordId: string,
    after: Record<string, unknown>,
    userId?: string,
    ip?: string,
  ): Promise<void> {
    await this.log({
      tenantSlug,
      userId,
      action: AuditAction.CREATE,
      module,
      recordId,
      after,
      ip,
    });
  }

  async logUpdate(
    tenantSlug: string,
    module: string,
    recordId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    userId?: string,
    ip?: string,
  ): Promise<void> {
    await this.log({
      tenantSlug,
      userId,
      action: AuditAction.UPDATE,
      module,
      recordId,
      before,
      after,
      ip,
    });
  }

  async logDelete(
    tenantSlug: string,
    module: string,
    recordId: string,
    before: Record<string, unknown>,
    userId?: string,
    ip?: string,
  ): Promise<void> {
    await this.log({
      tenantSlug,
      userId,
      action: AuditAction.DELETE,
      module,
      recordId,
      before,
      ip,
    });
  }

  async logStatusChange(
    tenantSlug: string,
    module: string,
    recordId: string,
    from: string,
    to: string,
    userId?: string,
    ip?: string,
  ): Promise<void> {
    await this.log({
      tenantSlug,
      userId,
      action: AuditAction.STATUS_CHANGE,
      module,
      recordId,
      before: { status: from },
      after: { status: to },
      ip,
    });
  }
}
