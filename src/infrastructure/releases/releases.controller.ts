import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReleasesService } from './releases.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Releases')
@Controller('releases')
export class ReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  // ── Public endpoints (consumed by all frontends) ──────────────────────────

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'List published releases (public, paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findPublished(@Query('page') page?: string, @Query('limit') limit?: string) {
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 50;
    const { rows, count } = await this.releasesService.findPublished(p, l);
    return {
      success: true,
      data: rows,
      meta: { page: p, limit: l, total: count, totalPages: Math.ceil(count / l) },
    };
  }

  @Get('public/latest')
  @Public()
  @ApiOperation({ summary: 'Get the latest published release' })
  async findLatest() {
    const release = await this.releasesService.findLatestPublished();
    return { success: true, data: release };
  }

  // ── Admin CRUD (backoffice only) ──────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all releases (admin, paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'isPublished', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('isPublished') isPublished?: string,
  ) {
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 20;
    const { rows, count } = await this.releasesService.findAll(p, l, {
      search,
      type,
      isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
    });
    return {
      success: true,
      data: rows,
      meta: { page: p, limit: l, total: count, totalPages: Math.ceil(count / l) },
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get release by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { success: true, data: await this.releasesService.findById(id) };
  }

  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new release' })
  async create(@Body() dto: CreateReleaseDto, @CurrentUser() user: { id: string }) {
    return { success: true, data: await this.releasesService.create(dto, user?.id) };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a release' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReleaseDto,
    @CurrentUser() user: { id: string },
  ) {
    return { success: true, data: await this.releasesService.update(id, dto, user?.id) };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, SuperAdminIpGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a release' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.releasesService.remove(id);
    return { success: true, data: null, message: 'Release deleted' };
  }
}
