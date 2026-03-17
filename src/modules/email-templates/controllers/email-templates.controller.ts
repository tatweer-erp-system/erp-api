import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { EmailTemplatesService } from '../services/email-templates.service';
import { CreateEmailTemplateDto } from '../dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from '../dto/update-email-template.dto';
import { FilterEmailTemplateDto } from '../dto/filter-email-template.dto';
import { PreviewEmailTemplateDto } from '../dto/preview-email-template.dto';
import { SendEmailDto } from '../dto/send-email.dto';

@ApiTags('Email Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private readonly service: EmailTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List email templates' })
  @Permissions('settings:view')
  findAll(@TenantId() tenantId: string, @Query() filter: FilterEmailTemplateDto) {
    return this.service.findAll(tenantId, filter);
  }

  @Post()
  @ApiOperation({ summary: 'Create an email template' })
  @Permissions('settings:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateEmailTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an email template by ID' })
  @Permissions('settings:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an email template' })
  @Permissions('settings:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an email template' })
  @Permissions('settings:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(tenantId, id, { userId: user.id, tenantId });
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Preview an email template with record data' })
  @Permissions('settings:view')
  preview(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: PreviewEmailTemplateDto,
  ) {
    return this.service.preview(tenantId, id, dto.recordId);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send an email using a template' })
  @Permissions('settings:manage')
  send(
    @TenantId() tenantId: string,
    @Body() dto: SendEmailDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.send(tenantId, dto, { userId: user.id, tenantId });
  }
}
