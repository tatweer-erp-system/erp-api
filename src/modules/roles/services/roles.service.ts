import { Injectable } from '@nestjs/common';
import { RolesRepository } from '@/database/sql/repositories/roles.repository';
import { PermissionsRepository } from '@/database/sql/repositories/permissions.repository';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from '../dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionsRepository: PermissionsRepository,
  ) {}
  findAll(search?: string, isActive?: boolean, page = 1, limit = 20) {
    return this.rolesRepository.findAll({ search, isActive }, page, limit);
  }
  findById(id: string) {
    return this.rolesRepository.findById(id);
  }
  create(dto: CreateRoleDto) {
    return this.rolesRepository.create(dto);
  }
  update(id: string, dto: UpdateRoleDto) {
    const { version, ...data } = dto;
    return this.rolesRepository.update(id, version, data);
  }
  remove(id: string) {
    return this.rolesRepository.softDelete(id);
  }
  dropdown() {
    return this.rolesRepository.findForDropdown();
  }
  getPermissions() {
    return this.permissionsRepository.findAll();
  }
  getRolePermissions(roleId: string) {
    return this.permissionsRepository.findByRoleId(roleId);
  }
  assignPermissions(roleId: string, dto: AssignPermissionsDto) {
    return this.permissionsRepository.assignPermissionsToRole(roleId, dto.permissionIds);
  }
}
