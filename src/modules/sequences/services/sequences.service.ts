import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SequencesRepository } from '@/database/sql/repositories/sequences.repository';
import { CreateSequenceDto } from '../dto/create-sequence.dto';
import { UpdateSequenceDto } from '../dto/update-sequence.dto';
import { ResetSequenceDto } from '../dto/reset-sequence.dto';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { SequenceEntity, ResetCycle } from '@/common/enums/sequence.enums';
import { v7 as uuidv7 } from 'uuid';

/** Default sequence configurations for new tenants. */
const DEFAULT_SEQUENCES: Array<{
  entity: SequenceEntity;
  prefix: string;
  padding: number;
  resetCycle: ResetCycle;
}> = [
  { entity: SequenceEntity.SALES_ORDER, prefix: 'SO', padding: 5, resetCycle: ResetCycle.NEVER },
  { entity: SequenceEntity.PURCHASE_ORDER, prefix: 'PO', padding: 5, resetCycle: ResetCycle.NEVER },
  { entity: SequenceEntity.EMPLOYEE, prefix: 'EMP', padding: 5, resetCycle: ResetCycle.NEVER },
  { entity: SequenceEntity.LEAD, prefix: 'LD', padding: 5, resetCycle: ResetCycle.NEVER },
  { entity: SequenceEntity.PROJECT, prefix: 'PRJ', padding: 5, resetCycle: ResetCycle.NEVER },
  {
    entity: SequenceEntity.ZATCA_INVOICE,
    prefix: 'INV',
    padding: 5,
    resetCycle: ResetCycle.YEARLY,
  },
];

@Injectable()
export class SequencesService {
  private readonly logger = new Logger(SequencesService.name);

  constructor(
    private readonly sequencesRepository: SequencesRepository,
    private readonly auditService: AuditSharedService,
  ) {}

  // ── Core method: generate next number ────────────────────────────────────

  /**
   * Generate the next sequential number for a given entity.
   * Uses SELECT FOR UPDATE to prevent race conditions.
   */
  async nextNumber(tenantId: string, entity: string, branchId?: string): Promise<string> {
    const sequelize = this.sequencesRepository.getSequelize();

    return sequelize.transaction(async (transaction) => {
      // 1. Find and lock the sequence row
      const sequence = await this.sequencesRepository.findForUpdate(
        tenantId,
        entity,
        branchId ?? null,
        transaction,
      );

      if (!sequence) {
        throw new NotFoundException(
          `Sequence configuration not found for entity "${entity}"${branchId ? ` and branch "${branchId}"` : ' (company-wide)'}`,
        );
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      let resetFields: { lastValue: number; fiscalYear?: number; fiscalMonth?: number } | null =
        null;

      // 2. Check if counter needs resetting based on cycle
      const seqRecord = sequence as unknown as Record<string, unknown>;
      if (seqRecord.resetCycle === ResetCycle.YEARLY || sequence.resetCycle === ResetCycle.YEARLY) {
        const fiscalYear =
          (sequence as unknown as Record<string, unknown>).fiscalYear ?? sequence.fiscalYear;
        if (fiscalYear !== currentYear) {
          resetFields = { lastValue: 1, fiscalYear: currentYear };
        }
      } else if (
        seqRecord.resetCycle === ResetCycle.MONTHLY ||
        sequence.resetCycle === ResetCycle.MONTHLY
      ) {
        const fiscalYear =
          (sequence as unknown as Record<string, unknown>).fiscalYear ?? sequence.fiscalYear;
        const fiscalMonth =
          (sequence as unknown as Record<string, unknown>).fiscalMonth ?? sequence.fiscalMonth;
        if (fiscalYear !== currentYear || fiscalMonth !== currentMonth) {
          resetFields = { lastValue: 1, fiscalYear: currentYear, fiscalMonth: currentMonth };
        }
      }

      // 3. Increment (or reset + set to 1)
      const seqId = (sequence as unknown as Record<string, unknown>).id as string;
      const newValue = await this.sequencesRepository.incrementAndGet(
        seqId,
        resetFields,
        transaction,
      );

      // 4. Format the number
      const prefix = ((sequence as unknown as Record<string, unknown>).prefix as string) ?? '';
      const padding = ((sequence as unknown as Record<string, unknown>).padding as number) ?? 5;
      const paddedValue = String(newValue).padStart(padding, '0');

      // 5. If branch-level, include branch code
      const branchCode = (sequence as unknown as Record<string, unknown>).branchCode as
        | string
        | undefined;
      if (branchId && branchCode) {
        return `${prefix}-${branchCode}-${paddedValue}`;
      }

      return `${prefix}-${paddedValue}`;
    });
  }

  // ── CRUD operations ──────────────────────────────────────────────────────

  async findAll(tenantId: string) {
    const sequences = await this.sequencesRepository.findAllForTenant(tenantId);
    return { data: sequences };
  }

  async create(tenantId: string, dto: CreateSequenceDto) {
    // Check for duplicate entity + branch combination
    const existing = await this.sequencesRepository.findOne({
      tenantId,
      where: {
        entity: dto.entity,
        branchId: dto.branchId ?? null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Sequence for entity "${dto.entity}" already exists${dto.branchId ? ' for this branch' : ' (company-wide)'}`,
      );
    }

    const now = new Date();
    const record = await this.sequencesRepository.create(
      {
        id: uuidv7(),
        branchId: dto.branchId ?? null,
        entity: dto.entity,
        prefix: dto.prefix,
        padding: dto.padding ?? 5,
        lastValue: 0,
        resetCycle: dto.resetCycle ?? ResetCycle.NEVER,
        fiscalYear: now.getFullYear(),
        fiscalMonth: now.getMonth() + 1,
      } as any,
      { tenantId },
    );

    return record;
  }

  async update(id: string, tenantId: string, dto: UpdateSequenceDto) {
    // Find the existing record
    const existing = await this.sequencesRepository.findById(id, { tenantId });
    if (!existing) {
      throw new NotFoundException(`Sequence with id ${id} not found`);
    }

    // Optimistic locking check
    const existingVersion = (existing as unknown as Record<string, unknown>).version as number;
    if (existingVersion !== dto.version) {
      throw new ConflictException(
        `Version conflict: expected ${dto.version}, but record is at version ${existingVersion}`,
      );
    }

    const updateData: Record<string, unknown> = {};
    if (dto.prefix !== undefined) updateData.prefix = dto.prefix;
    if (dto.padding !== undefined) updateData.padding = dto.padding;
    if (dto.resetCycle !== undefined) updateData.resetCycle = dto.resetCycle;
    updateData.version = existingVersion + 1;

    const updated = await this.sequencesRepository.update(id, updateData as any, { tenantId });
    return updated;
  }

  async reset(id: string, tenantId: string, dto: ResetSequenceDto, userId?: string) {
    // Find the existing record
    const existing = await this.sequencesRepository.findById(id, { tenantId });
    if (!existing) {
      throw new NotFoundException(`Sequence with id ${id} not found`);
    }

    // ZATCA sequences must NEVER be manually reset
    const entity = (existing as unknown as Record<string, unknown>).entity as string;
    if (entity === SequenceEntity.ZATCA_INVOICE) {
      throw new ForbiddenException('ZATCA invoice sequences cannot be manually reset');
    }

    // Optimistic locking check
    const existingVersion = (existing as unknown as Record<string, unknown>).version as number;
    if (existingVersion !== dto.version) {
      throw new ConflictException(
        `Version conflict: expected ${dto.version}, but record is at version ${existingVersion}`,
      );
    }

    const sequelize = this.sequencesRepository.getSequelize();

    await sequelize.transaction(async (transaction) => {
      const affected = await this.sequencesRepository.resetCounter(
        id,
        tenantId,
        dto.version,
        transaction,
      );

      if (affected === 0) {
        throw new ConflictException(
          'Failed to reset sequence — version conflict or record not found',
        );
      }
    });

    // Audit log the reset operation
    const lastValue = (existing as unknown as Record<string, unknown>).lastValue;
    await this.auditService.logUpdate(
      tenantId,
      'settings.sequences',
      id,
      { lastValue: lastValue, reason: dto.reason },
      { lastValue: 0 },
      userId,
    );

    this.logger.log(
      `Sequence ${id} (entity=${entity}) reset by user ${userId}. Reason: ${dto.reason}`,
    );

    return this.sequencesRepository.findById(id, { tenantId });
  }

  // ── Seeding & cloning ────────────────────────────────────────────────────

  /**
   * Create default sequence configurations for a new tenant.
   */
  async seedDefaultSequences(tenantId: string): Promise<void> {
    const now = new Date();

    for (const def of DEFAULT_SEQUENCES) {
      const exists = await this.sequencesRepository.exists(
        { entity: def.entity, branchId: null },
        { tenantId },
      );

      if (!exists) {
        await this.sequencesRepository.create(
          {
            id: uuidv7(),
            branchId: null,
            entity: def.entity,
            prefix: def.prefix,
            padding: def.padding,
            lastValue: 0,
            resetCycle: def.resetCycle,
            fiscalYear: now.getFullYear(),
            fiscalMonth: now.getMonth() + 1,
          } as any,
          { tenantId },
        );
      }
    }

    this.logger.log(`Default sequences seeded for tenant ${tenantId}`);
  }

  /**
   * Clone company-wide sequences for a specific branch.
   */
  async cloneForBranch(tenantId: string, branchId: string): Promise<void> {
    const companyWide = await this.sequencesRepository.findCompanyWide(tenantId);
    const now = new Date();

    for (const seq of companyWide) {
      const seqData = seq as unknown as Record<string, unknown>;
      const entity = seqData.entity as string;

      const exists = await this.sequencesRepository.exists(
        { entity, branchId: branchId },
        { tenantId },
      );

      if (!exists) {
        await this.sequencesRepository.create(
          {
            id: uuidv7(),
            branchId,
            entity,
            prefix: seqData.prefix as string,
            padding: (seqData.padding as number) ?? 5,
            lastValue: 0,
            resetCycle: (seqData.resetCycle as string) ?? ResetCycle.NEVER,
            fiscalYear: now.getFullYear(),
            fiscalMonth: now.getMonth() + 1,
          } as any,
          { tenantId },
        );
      }
    }

    this.logger.log(`Sequences cloned for branch ${branchId} in tenant ${tenantId}`);
  }
}
