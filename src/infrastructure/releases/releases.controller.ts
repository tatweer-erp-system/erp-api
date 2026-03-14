import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReleasesService } from './releases.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminIpGuard } from '@/common/guards/super-admin-ip.guard';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuditContext } from '@/common/interfaces/repository.interface';

// ── Public controller (/releases) — no auth ────────────────────────────────

@ApiTags('Releases (Public)')
@Controller('releases')
export class PublicReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all published releases' })
  @ApiResponse({ status: 200, description: 'Published releases list' })
  async listPublished() {
    return this.releasesService.listPublished();
  }

  @Get('latest')
  @Public()
  @ApiOperation({ summary: 'Get the latest published release' })
  @ApiResponse({ status: 200, description: 'Latest published release' })
  async getLatest() {
    return this.releasesService.getLatest();
  }

  @Get(':version')
  @Public()
  @ApiOperation({ summary: 'Get a published release by version' })
  @ApiResponse({ status: 200, description: 'Release found' })
  @ApiResponse({ status: 404, description: 'Release not found' })
  async findByVersion(@Param('version') version: string) {
    return this.releasesService.findByVersion(version);
  }
}

// ── Admin controller (/admin/releases) — requires auth ─────────────────────

@ApiTags('Admin - Releases')
@Controller('admin/releases')
@UseGuards(JwtAuthGuard, SuperAdminIpGuard)
@ApiBearerAuth()
export class AdminReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  @Get()
  @ApiOperation({ summary: 'List all releases (including unpublished)' })
  @ApiResponse({ status: 200, description: 'All releases list' })
  async listAll() {
    return this.releasesService.listAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new release' })
  @ApiResponse({ status: 201, description: 'Release created' })
  async create(@Body() dto: CreateReleaseDto, @CurrentUser() user: { id: string }) {
    const auditContext: AuditContext = { userId: user?.id };
    return this.releasesService.create(dto, auditContext);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a release' })
  @ApiResponse({ status: 200, description: 'Release updated' })
  @ApiResponse({ status: 404, description: 'Release not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReleaseDto,
    @CurrentUser() user: { id: string },
  ) {
    const auditContext: AuditContext = { userId: user?.id };
    return this.releasesService.update(id, dto, auditContext);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a release' })
  @ApiResponse({ status: 200, description: 'Release published' })
  @ApiResponse({ status: 404, description: 'Release not found' })
  async publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    const auditContext: AuditContext = { userId: user?.id };
    return this.releasesService.publish(id, auditContext);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish a release' })
  @ApiResponse({ status: 200, description: 'Release unpublished' })
  @ApiResponse({ status: 404, description: 'Release not found' })
  async unpublish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    const auditContext: AuditContext = { userId: user?.id };
    return this.releasesService.unpublish(id, auditContext);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a release' })
  @ApiResponse({ status: 200, description: 'Release deleted' })
  @ApiResponse({ status: 404, description: 'Release not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    const auditContext: AuditContext = { userId: user?.id };
    await this.releasesService.delete(id, auditContext);
  }
}
