import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CrmService } from '@/modules/crm/services/crm.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  @ApiOperation({ summary: 'List activities for a record' })
  @ApiQuery({ name: 'recordModel', required: true })
  @ApiQuery({ name: 'recordId', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findByRecord(
    @Query('recordModel') recordModel: string,
    @Query('recordId') recordId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.crmService.findActivitiesByRecord(
      recordModel,
      recordId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get activity by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findById(@Param('id') id: string) {
    return this.crmService.findActivityById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create activity' })
  create(@Body() body: Record<string, any>) {
    return this.crmService.createActivity(body);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark activity as completed' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  complete(@Param('id') id: string, @Body() body: { completedById: string }) {
    return this.crmService.completeActivity(id, body.completedById);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete activity' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.crmService.removeActivity(id);
  }
}
