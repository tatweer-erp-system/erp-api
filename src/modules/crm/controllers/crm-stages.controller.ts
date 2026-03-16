import {
  Controller,
  Get,
  Post,
  Put,
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
import { CrmStageType } from '@/common/enums/crm.enums';

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/stages')
export class CrmStagesController {
  constructor(private readonly crmService: CrmService) {}

  @Get('dropdown')
  @ApiOperation({ summary: 'Get CRM stages dropdown list' })
  findForDropdown() {
    return this.crmService.stagesDropdown();
  }

  @Get()
  @ApiOperation({ summary: 'List CRM stages' })
  @ApiQuery({ name: 'stageType', required: false, enum: CrmStageType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query('stageType') stageType?: CrmStageType, @Query('isActive') isActive?: string) {
    return this.crmService.findAllStages(
      stageType,
      isActive !== undefined ? isActive === 'true' : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get CRM stage by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findById(@Param('id') id: string) {
    return this.crmService.findStageById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create CRM stage' })
  create(@Body() body: Record<string, any>) {
    return this.crmService.createStage(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update CRM stage' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const { version, ...data } = body;
    return this.crmService.updateStage(id, version, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete CRM stage' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.crmService.removeStage(id);
  }
}
