import { Injectable } from '@nestjs/common';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { ProductCategoriesRepository } from '@/database/sql/repositories/product-categories.repository';
import { BranchProductsRepository } from '@/database/sql/repositories/branch-products.repository';
import { TaxesRepository } from '@/database/sql/repositories/taxes.repository';
import { CreateProductDto, UpdateProductDto, FilterProductDto } from '../dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesRepo: ProductCategoriesRepository,
    private readonly branchProductsRepo: BranchProductsRepository,
    private readonly taxesRepo: TaxesRepository,
  ) {}

  findAll(f: FilterProductDto) {
    return this.productsRepository.findAll(f, f.page, f.limit);
  }
  findById(id: string) {
    return this.productsRepository.findById(id);
  }
  create(dto: CreateProductDto) {
    return this.productsRepository.create(dto);
  }
  update(id: string, dto: UpdateProductDto) {
    const { version, ...data } = dto;
    return this.productsRepository.update(id, version, data);
  }
  remove(id: string) {
    return this.productsRepository.softDelete(id);
  }
  dropdown(type?: any) {
    return this.productsRepository.findForDropdown(type);
  }

  // Category methods
  findAllCategories(search?: string, page = 1, limit = 20) {
    return this.categoriesRepo.findAll(search, page, limit);
  }
  findCategoryById(id: string) {
    return this.categoriesRepo.findById(id);
  }
  createCategory(data: any) {
    return this.categoriesRepo.create(data);
  }
  updateCategory(id: string, dto: any) {
    const { version, ...data } = dto;
    return this.categoriesRepo.update(id, version, data);
  }
  removeCategory(id: string) {
    return this.categoriesRepo.softDelete(id);
  }
  categoriesDropdown() {
    return this.categoriesRepo.findForDropdown();
  }

  // Branch-product assignment
  getBranchProducts(branchId: string) {
    return this.branchProductsRepo.findByBranch(branchId);
  }
  assignProduct(branchId: string, productId: string) {
    return this.branchProductsRepo.assign(branchId, productId);
  }
  unassignProduct(branchId: string, productId: string) {
    return this.branchProductsRepo.unassign(branchId, productId);
  }
  assignBulk(branchId: string, productIds: string[]) {
    return this.branchProductsRepo.assignBulk(branchId, productIds);
  }
}
