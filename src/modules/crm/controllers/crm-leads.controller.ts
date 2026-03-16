import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { CrmService } from '@/modules/crm/services/crm.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CrmLeadStatus } from '@/common/enums/crm.enums';

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/leads')
export class CrmLeadsController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  @ApiOperation({ summary: 'List CRM leads for a branch' })
  @ApiHeader({ name: 'x-branch-id', required: true })
  @ApiQuery({ name: 'status', required: false, enum: CrmLeadStatus })
  @ApiQuery({ name: 'stageId', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Headers('x-branch-id') branchId: string,
    @Query('status') status?: CrmLeadStatus,
    @Query('stageId') stageId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.crmService.findAllLeads(
      branchId,
      { status, stageId, assignedTo, search },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get CRM lead by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findById(@Param('id') id: string) {
    return this.crmService.findLeadById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create CRM lead' })
  create(@Body() body: Record<string, any>) {
    return this.crmService.createLead(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update CRM lead' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const { version, ...data } = body;
    return this.crmService.updateLead(id, version, data);
  }

  @Post(':id/won')
  @ApiOperation({ summary: 'Mark lead as won' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  markWon(@Param('id') id: string) {
    return this.crmService.markWon(id);
  }

  @Post(':id/lost')
  @ApiOperation({ summary: 'Mark lead as lost' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  markLost(@Param('id') id: string, @Body() body: { lossReason: string }) {
    return this.crmService.markLost(id, body.lossReason);
  }

  @Post(':id/move-stage')
  @ApiOperation({ summary: 'Move lead to another stage' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  moveStage(@Param('id') id: string, @Body() body: { stageId: string }) {
    return this.crmService.moveToStage(id, body.stageId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete CRM lead' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.crmService.removeLead(id);
  }
}
