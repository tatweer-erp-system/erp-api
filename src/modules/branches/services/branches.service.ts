import { Injectable } from '@nestjs/common';
import { BranchesRepository } from '@/database/sql/repositories/branches.repository';
import { CreateBranchDto, UpdateBranchDto, FilterBranchDto } from '../dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly branchesRepository: BranchesRepository) {}
  findAll(f: FilterBranchDto) {
    return this.branchesRepository.findAll(f, f.page, f.limit);
  }
  findById(id: string) {
    return this.branchesRepository.findById(id);
  }
  create(dto: CreateBranchDto) {
    return this.branchesRepository.create(dto);
  }
  update(id: string, dto: UpdateBranchDto) {
    const { version, ...data } = dto;
    return this.branchesRepository.update(id, version, data);
  }
  remove(id: string) {
    return this.branchesRepository.softDelete(id);
  }
  dropdown() {
    return this.branchesRepository.findForDropdown();
  }
}
