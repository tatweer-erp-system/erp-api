import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Plan } from '@/database/sql/entities/plan.entity';
import { PlansRepository } from '@/database/sql/repositories/plans.repository';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly plansRepository: PlansRepository) {}

  findAll(): Promise<Plan[]> {
    return this.plansRepository.findAll();
  }

  findAllActive(): Promise<Plan[]> {
    return this.plansRepository.findAll(true);
  }

  async findOne(id: string): Promise<Plan> {
    return this.plansRepository.findById(id);
  }

  async findBySlug(slug: string): Promise<Plan> {
    const plan = await this.plansRepository.findBySlug(slug);
    if (!plan) throw new NotFoundException(`Plan '${slug}' not found`);
    return plan;
  }

  async create(dto: CreatePlanDto): Promise<Plan> {
    const existing = await this.plansRepository.findBySlug(dto.slug);
    if (existing) throw new ConflictException(`Plan slug '${dto.slug}' already exists`);
    return this.plansRepository.create({
      slug: dto.slug,
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      descriptionEn: dto.descriptionEn ?? null,
      descriptionAr: dto.descriptionAr ?? null,
      monthlyPrice: dto.monthlyPrice,
      annualPrice: dto.annualPrice,
      currency: dto.currency ?? 'SAR',
      modules: dto.modules,
      maxUsers: dto.maxUsers ?? null,
      features: dto.features ?? {},
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    } as Partial<Plan>);
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    return this.plansRepository.update(id, dto as Partial<Plan>);
  }

  async remove(id: string): Promise<void> {
    await this.plansRepository.hardDelete(id);
  }
}
