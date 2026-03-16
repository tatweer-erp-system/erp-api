import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transfer } from '@/database/sql/entities/transfer.entity';
import { TransferLine } from '@/database/sql/entities/transfer-line.entity';
import { TransferStatus } from '@/common/enums/inventory.enums';

@Injectable()
export class TransfersRepository {
  constructor(
    @InjectRepository(Transfer)
    private readonly repo: Repository<Transfer>,
    @InjectRepository(TransferLine)
    private readonly lineRepo: Repository<TransferLine>,
  ) {}

  async findAll(branchId: string, filters: { status?: TransferStatus } = {}, page = 1, limit = 20) {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.deleted_at IS NULL')
      .andWhere('t.branch_id = :branchId', { branchId });

    if (filters.status) qb.andWhere('t.status = :status', { status: filters.status });

    const [data, total] = await qb
      .orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Transfer> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) throw new NotFoundException({ en: 'Transfer not found', ar: 'النقل غير موجود' });
    return entity;
  }

  async findWithLines(id: string): Promise<Transfer & { lines: TransferLine[] }> {
    const transfer = await this.findById(id);
    const lines = await this.lineRepo.find({ where: { transferId: id } as any });
    return Object.assign(transfer, { lines });
  }

  async create(data: Partial<Transfer>, ..._opts: any[]): Promise<Transfer> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async upsertLines(transferId: string, lines: Partial<TransferLine>[]): Promise<TransferLine[]> {
    await this.findById(transferId);
    await this.lineRepo.delete({ transferId } as any);
    const created = this.lineRepo.create(lines.map((l) => ({ ...l, transferId })) as any[]);
    return this.lineRepo.save(created) as any;
  }

  async updateStatus(id: string, status: TransferStatus): Promise<Transfer> {
    const entity = await this.findById(id);
    const allowedTransitions: Partial<Record<TransferStatus, TransferStatus[]>> = {
      [TransferStatus.DRAFT]: [TransferStatus.READY, TransferStatus.CANCELLED],
      [TransferStatus.READY]: [TransferStatus.IN_TRANSIT, TransferStatus.CANCELLED],
      [TransferStatus.IN_TRANSIT]: [TransferStatus.DONE, TransferStatus.CANCELLED],
    };
    const allowed = allowedTransitions[entity.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException({
        en: `Cannot transition from ${entity.status} to ${status}`,
        ar: `لا يمكن الانتقال من ${entity.status} إلى ${status}`,
      });
    }
    if (status === TransferStatus.DONE) {
      entity.doneDate = new Date();
    }
    entity.status = status;
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    if (entity.status === TransferStatus.DONE) {
      throw new BadRequestException({
        en: 'Completed transfers cannot be deleted',
        ar: 'لا يمكن حذف عمليات النقل المكتملة',
      });
    }
    await this.repo.softRemove(entity);
  }
}
