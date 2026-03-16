import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchProduct } from '@/database/sql/entities/branch-product.entity';

@Injectable()
export class BranchProductsRepository {
  constructor(@InjectRepository(BranchProduct) private readonly repo: Repository<BranchProduct>) {}

  async findByBranch(branchId: string): Promise<BranchProduct[]> {
    return this.repo.find({ where: { branchId } as any });
  }
  async findByProduct(productId: string): Promise<BranchProduct[]> {
    return this.repo.find({ where: { productId } as any });
  }
  async assign(branchId: string, productId: string): Promise<BranchProduct> {
    return this.repo.save(this.repo.create({ branchId, productId } as any)) as any;
  }
  async unassign(branchId: string, productId: string): Promise<void> {
    await this.repo.delete({ branchId, productId } as any);
  }
  async isAssigned(branchId: string, productId: string): Promise<boolean> {
    return !!(await this.repo.findOne({ where: { branchId, productId } as any }));
  }
  async assignBulk(branchId: string, productIds: string[]): Promise<void> {
    const existing = await this.findByBranch(branchId);
    const existingIds = new Set(existing.map((e) => e.productId));
    const toAdd: BranchProduct[] = productIds
      .filter((id) => !existingIds.has(id))
      .map(
        (productId) => this.repo.create({ branchId, productId } as any) as unknown as BranchProduct,
      );
    if (toAdd.length) await this.repo.save(toAdd);
  }
}
