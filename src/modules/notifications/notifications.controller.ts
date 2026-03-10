import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── Static routes MUST come before /:id ──────────────────────────────────

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@TenantSlug() tenantSlug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(tenantSlug, user.id);
  }

  @Post('send')
  @UseGuards(PermissionsGuard)
  @Permissions('notifications:create')
  @ApiOperation({ summary: 'Send a notification' })
  send(@TenantSlug() tenantSlug: string, @Body() dto: SendNotificationDto) {
    return this.notificationsService.send(tenantSlug, dto);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@TenantSlug() tenantSlug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(tenantSlug, user.id);
  }

  // ── Preferences endpoints ────────────────────────────────────────────────

  @Get('preferences')
  @ApiOperation({ summary: 'Get my notification preferences' })
  getPreferences(@TenantSlug() tenantSlug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(tenantSlug, user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Bulk update notification preferences' })
  updatePreferences(
    @TenantSlug() tenantSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(tenantSlug, user.id, dto);
  }

  // ── Templates endpoints (admin) ──────────────────────────────────────────

  @Get('templates')
  @UseGuards(PermissionsGuard)
  @Permissions('notifications:read')
  @ApiOperation({ summary: 'List notification templates' })
  getTemplates(@TenantSlug() tenantSlug: string, @Query() query: PaginationDto) {
    return this.notificationsService.getTemplates(tenantSlug, query);
  }

  @Post('templates')
  @UseGuards(PermissionsGuard)
  @Permissions('notifications:create')
  @ApiOperation({ summary: 'Create a notification template' })
  createTemplate(@TenantSlug() tenantSlug: string, @Body() dto: CreateTemplateDto) {
    return this.notificationsService.createTemplate(tenantSlug, dto);
  }

  @Get('templates/:id')
  @UseGuards(PermissionsGuard)
  @Permissions('notifications:read')
  @ApiOperation({ summary: 'Get a notification template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  getTemplateById(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.notificationsService.getTemplateById(tenantSlug, id);
  }

  @Put('templates/:id')
  @UseGuards(PermissionsGuard)
  @Permissions('notifications:update')
  @ApiOperation({ summary: 'Update a notification template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  updateTemplate(
    @TenantSlug() tenantSlug: string,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.notificationsService.updateTemplate(tenantSlug, id, dto);
  }

  @Delete('templates/:id')
  @UseGuards(PermissionsGuard)
  @Permissions('notifications:delete')
  @ApiOperation({ summary: 'Delete a notification template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  removeTemplate(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.notificationsService.removeTemplate(tenantSlug, id);
  }

  // ── Notification CRUD (parameterized routes last) ────────────────────────

  @Get()
  @ApiOperation({ summary: 'List my notifications (paginated)' })
  findAll(
    @TenantSlug() tenantSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.findAll(tenantSlug, user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification detail' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  findById(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.notificationsService.findById(tenantSlug, id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  markAsRead(
    @TenantSlug() tenantSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(tenantSlug, user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  remove(@TenantSlug() tenantSlug: string, @Param('id') id: string) {
    return this.notificationsService.remove(tenantSlug, id);
  }
}
