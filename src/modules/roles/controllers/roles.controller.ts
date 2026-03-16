import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from '../dto/create-role.dto';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}
  @Get() findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.rolesService.findAll(search, isActive, +page, +limit);
  }
  @Get('dropdown') dropdown() {
    return this.rolesService.dropdown();
  }
  @Get('permissions') getPermissions() {
    return this.rolesService.getPermissions();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }
  @Get(':id/permissions') getRolePermissions(@Param('id') id: string) {
    return this.rolesService.getRolePermissions(id);
  }
  @Post() create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }
  @Post(':id/permissions') assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(id, dto);
  }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
