import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { BranchesService } from '../services/branches.service';
import { CreateBranchDto, UpdateBranchDto, FilterBranchDto } from '../dto/create-branch.dto';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}
  @Get() findAll(@Query() q: FilterBranchDto) {
    return this.branchesService.findAll(q);
  }
  @Get('dropdown') dropdown() {
    return this.branchesService.dropdown();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.branchesService.findById(id);
  }
  @Post() create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }
}
