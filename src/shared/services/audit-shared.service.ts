import { Injectable } from '@nestjs/common';
import {
  AuditService as InfraAuditService,
  CreateAuditLogDto,
} from '@/infrastructure/audit/audit.service';
import { AuditLogEntry, AuditAction } from '@/common/interfaces/audit.interface';

@Injectable()
export class AuditSharedService {
  constructor(private readonly auditService: InfraAuditService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.auditService.log(entry as CreateAuditLogDto);
  }

  async logCreate(
    tenantSlug: string,
    entity: string,
    entityId: string,
    newValues: Record<string, unknown>,
    userId?: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.log({
      tenantSlug,
      userId,
      action: AuditAction.CREATE,
      entity,
      entityId,
      newValues,
      ipAddress,
    });
  }

  async logUpdate(
    tenantSlug: string,
    entity: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    userId?: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.log({
      tenantSlug,
      userId,
      action: AuditAction.UPDATE,
      entity,
      entityId,
      oldValues,
      newValues,
      ipAddress,
    });
  }

  async logDelete(
    tenantSlug: string,
    entity: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    userId?: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.log({
      tenantSlug,
      userId,
      action: AuditAction.DELETE,
      entity,
      entityId,
      oldValues,
      ipAddress,
    });
  }

  async logStatusChange(
    tenantSlug: string,
    entity: string,
    entityId: string,
    from: string,
    to: string,
    userId?: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.log({
      tenantSlug,
      userId,
      action: AuditAction.STATUS_CHANGE,
      entity,
      entityId,
      oldValues: { status: from },
      newValues: { status: to },
      ipAddress,
    });
  }
}
