import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KitchenTicket } from '@/database/sql/entities/kitchen-ticket.entity';
import { KitchenTicketStatus } from '@/common/enums/restaurant.enums';

@Injectable()
export class KitchenTicketsRepository {
  constructor(
    @InjectRepository(KitchenTicket)
    private readonly repo: Repository<KitchenTicket>,
  ) {}

  async findAll(
    branchId: string,
    filters: { orderId?: string; status?: KitchenTicketStatus } = {},
    page = 1,
    limit = 20,
  ): Promise<{
    data: KitchenTicket[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.repo
      .createQueryBuilder('kt')
      .where('kt.deleted_at IS NULL')
      .andWhere('kt.branch_id = :branchId', { branchId });

    if (filters.orderId) {
      qb.andWhere('kt.order_id = :orderId', { orderId: filters.orderId });
    }
    if (filters.status) {
      qb.andWhere('kt.status = :status', { status: filters.status });
    }

    const [data, total] = await qb
      .orderBy('kt.fired_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<KitchenTicket> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({
        en: 'Kitchen ticket not found',
        ar: 'تذكرة المطبخ غير موجودة',
      });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<KitchenTicket | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(data: Partial<KitchenTicket>, ..._opts: any[]): Promise<KitchenTicket> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async updateStatus(
    id: string,
    status: KitchenTicketStatus,
    ..._opts: any[]
  ): Promise<KitchenTicket> {
    const entity = await this.findById(id);
    entity.status = status;
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<KitchenTicket>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<KitchenTicket> {
    const entity = await this.findById(id);
    const data: Partial<KitchenTicket> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async findActiveByBranch(branchId: string): Promise<KitchenTicket[]> {
    return this.repo
      .createQueryBuilder('kt')
      .where('kt.deleted_at IS NULL')
      .andWhere('kt.branch_id = :branchId', { branchId })
      .andWhere('kt.status NOT IN (:...doneStatuses)', {
        doneStatuses: [KitchenTicketStatus.SERVED, KitchenTicketStatus.CANCELLED],
      })
      .orderBy('kt.fired_at', 'ASC')
      .getMany();
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findOne(opts: any): Promise<KitchenTicket | null> {
    const where = opts?.where ?? {};
    return this.repo.findOne({ where } as any);
  }

  async createTransaction(..._args: any[]): Promise<any> {
    return {
      commit: async () => {},
      rollback: async () => {},
    };
  }
}
