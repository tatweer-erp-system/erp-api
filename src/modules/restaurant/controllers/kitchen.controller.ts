import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { KitchenService } from '../services/kitchen.service';
import { FireCourseDto } from '../dto/fire-course.dto';
import { UpdateTicketStatusDto } from '../dto/update-ticket-status.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Restaurant - Kitchen Tickets')
@Controller('restaurant/kitchen-tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Post()
  @Permissions('restaurant:manage')
  @ApiOperation({ summary: 'Fire a course — create kitchen ticket' })
  @ApiCreatedResponse({ description: 'Kitchen ticket created' })
  fireCourse(
    @TenantId() tenantId: string,
    @Body() dto: FireCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kitchenService.fireCourse(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get()
  @Permissions('restaurant:read')
  @ApiOperation({ summary: 'List kitchen tickets' })
  @ApiOkResponse({ description: 'Paginated list of kitchen tickets' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.kitchenService.findAll(tenantId, query);
  }

  @Get(':id')
  @Permissions('restaurant:read')
  @ApiOperation({ summary: 'Get a kitchen ticket by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Kitchen ticket details' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.kitchenService.findById(tenantId, id);
  }

  @Patch(':id/status')
  @Permissions('restaurant:manage')
  @ApiOperation({ summary: 'Update kitchen ticket status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Ticket status updated' })
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kitchenService.updateStatus(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Delete(':id')
  @Permissions('restaurant:manage')
  @ApiOperation({ summary: 'Cancel a kitchen ticket' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Ticket cancelled' })
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kitchenService.cancel(tenantId, id, { userId: user.id, tenantId });
  }
}
