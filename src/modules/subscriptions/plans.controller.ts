import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '../../common/guards/super-admin-ip.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /** Public: list active plans for marketing/signup pages */
  @Public()
  @Get('public')
  @ApiOperation({ summary: 'List active plans (public)' })
  findActive() {
    return this.plansService.findAllActive();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Get()
  @ApiOperation({ summary: 'List all plans (superadmin)' })
  findAll() {
    return this.plansService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
