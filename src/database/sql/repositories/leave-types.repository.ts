import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveType } from '@/database/sql/entities/leave-type.entity';

@Injectable()
export class LeaveTypesRepository {
  constructor(@InjectRepository(LeaveType) private readonly repo: Repository<LeaveType>) {}

  async findAll(isActive?: boolean) {
    const qb = this.repo.createQueryBuilder('lt').where('lt.deleted_at IS NULL');
    if (isActive !== undefined) qb.andWhere('lt.is_active = :a', { a: isActive });
    return qb.orderBy('lt.name_en').getMany();
  }

  async findById(id: string, ..._opts: any[]): Promise<LeaveType> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e)
      throw new NotFoundException({ en: 'Leave type not found', ar: 'نوع الإجازة غير موجود' });
    return e;
  }

  async create(data: Partial<LeaveType>, ..._opts: any[]): Promise<LeaveType> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<LeaveType>,
    ..._opts: any[]
  ): Promise<LeaveType> {
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async findForDropdown(..._opts: any[]) {
    return this.repo
      .createQueryBuilder('lt')
      .select([
        'lt.id AS "id"',
        'lt.name_en AS "nameEn"',
        'lt.name_ar AS "nameAr"',
        'lt.color AS "color"',
      ])
      .where('lt.deleted_at IS NULL')
      .andWhere('lt.is_active = true')
      .orderBy('lt.name_en')
      .getRawMany();
  }
}
