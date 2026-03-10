import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminsService } from '../services/admins.service';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Admins')
@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'] || '';
    return this.adminsService.login(dto, ip, userAgent);
  }

  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List all admins' })
  @ApiResponse({ status: 200, description: 'Admins list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - IP not allowed' })
  findAll(@Query() query: PaginationDto) {
    return this.adminsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiParam({ name: 'id', description: 'Admin UUID' })
  @ApiResponse({ status: 200, description: 'Admin retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  findById(@Param('id') id: string) {
    return this.adminsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new admin' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  create(@Body() dto: CreateAdminDto, @CurrentUser() user: AuthenticatedUser) {
    return this.adminsService.create(dto, { userId: user.id });
  }

  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ summary: 'Update an admin' })
  @ApiParam({ name: 'id', description: 'Admin UUID' })
  @ApiResponse({ status: 200, description: 'Admin updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminsService.update(id, dto, { userId: user.id });
  }

  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an admin (soft delete)' })
  @ApiParam({ name: 'id', description: 'Admin UUID' })
  @ApiResponse({ status: 200, description: 'Admin deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminsService.remove(id, { userId: user.id });
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '';
  }
}
