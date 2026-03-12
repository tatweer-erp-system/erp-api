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
import { NotificationsService } from '../services/notifications.service';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── Static routes MUST come before /:id ──────────────────────────────────

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(tenantId, user.id);
  }

  @Post('send')
  @UseGuards(PermissionsGuard)
  @Permissions('notifications:create')
  @ApiOperation({ summary: 'Send a notification' })
  send(@TenantId() tenantId: string, @Body() dto: SendNotificationDto) {
    return this.notificationsService.send(tenantId, dto);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(tenantId, user.id);
  }

  // ── Preferences endpoints ────────────────────────────────────────────────

  @Get('preferences')
  @ApiOperation({ summary: 'Get my notification preferences' })
  getPreferences(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(tenantId, user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Bulk update notification preferences' })
  updatePreferences(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(tenantId, user.id, dto);
  }

  // ── Templates endpoints (admin) ──────────────────────────────────────────

  @Get('templates')
  @UseGuards(PermissionsGuard)
  @Permissions('notifications:read')
  @ApiOperation({ summary: 'List notification templates' })
  getTemplates(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.notificationsService.getTemplates(tenantId, query);
  }

  @Post('templates')
  @UseGuards(PermissionsGuard)
  @Permissions('notifications:create')
  @ApiOperation({ summary: 'Create a notification template' })
  createTemplate(@TenantId() tenantId: string, @Body() dto: CreateTemplateDto) {
    return this.notificationsService.createTemplate(tenantId, dto);
  }

  @Get('templates/:id')
  @UseGuards(PermissionsGuard)
  @Permissions('notifications:read')
  @ApiOperation({ summary: 'Get a notification template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  getTemplateById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.notificationsService.getTemplateById(tenantId, id);
  }

  @Put('templates/:id')
  @UseGuards(PermissionsGuard)
  @Permissions('notifications:update')
  @ApiOperation({ summary: 'Update a notification template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  updateTemplate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.notificationsService.updateTemplate(tenantId, id, dto);
  }

  @Delete('templates/:id')
  @UseGuards(PermissionsGuard)
  @Permissions('notifications:delete')
  @ApiOperation({ summary: 'Delete a notification template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  removeTemplate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.notificationsService.removeTemplate(tenantId, id);
  }

  // ── Notification CRUD (parameterized routes last) ────────────────────────

  @Get()
  @ApiOperation({ summary: 'List my notifications (paginated)' })
  findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.findAll(tenantId, user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification detail' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.notificationsService.findById(tenantId, id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  markAsRead(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(tenantId, user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.notificationsService.remove(tenantId, id);
  }
}
