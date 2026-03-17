import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { BaseRepository } from '../base.repository';
import { Journal } from '../entities/journal.entity';
import { JournalType } from '@/common/enums/accounting-new.enums';

@Injectable()
export class JournalsRepository extends BaseRepository<Journal> {
  constructor() {
    super(Journal, true);
  }

  async findByCode(
    tenantId: string,
    code: string,
    transaction?: Transaction,
  ): Promise<Journal | null> {
    return this.findOne({ where: { code }, tenantId, transaction });
  }

  async existsByCode(tenantId: string, code: string): Promise<boolean> {
    return this.exists({ code }, { tenantId });
  }

  /**
   * Find the first active journal of a given type for a tenant.
   * Used by JournalPosterSharedService to resolve the correct journal for auto-posting.
   */
  async findByType(
    tenantId: string,
    type: JournalType,
    transaction?: Transaction,
  ): Promise<Journal | null> {
    return this.findOne({
      where: { type, isActive: true },
      tenantId,
      transaction,
    });
  }
}
