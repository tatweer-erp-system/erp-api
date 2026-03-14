import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { CurrencyService } from './currency.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { QueryExchangeRateDto, RateHistoryQueryDto } from './dto/query-exchange-rate.dto';

@ApiTags('Currency')
@ApiBearerAuth()
@ModuleFeature('accounting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  // ── Currencies ─────────────────────────────────────────────────────────────

  @Post('currencies')
  @ApiOperation({ summary: 'Create a currency' })
  @Permissions('accounting:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateCurrencyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.currencyService.create(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get('currencies')
  @ApiOperation({ summary: 'List all currencies for the tenant' })
  @Permissions('accounting:view')
  findAll(@TenantId() tenantId: string) {
    return this.currencyService.findAll(tenantId);
  }

  @Patch('currencies/:id')
  @ApiOperation({ summary: 'Update a currency' })
  @Permissions('accounting:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCurrencyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.currencyService.update(tenantId, id, dto, { userId: user.id, tenantId });
  }

  @Post('currencies/:id/set-base')
  @ApiOperation({ summary: 'Set a currency as the base (functional) currency' })
  @Permissions('accounting:manage')
  @HttpCode(HttpStatus.OK)
  setBase(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.currencyService.setBase(tenantId, id, { userId: user.id, tenantId });
  }

  // ── Exchange Rates ─────────────────────────────────────────────────────────

  @Post('exchange-rates')
  @ApiOperation({ summary: 'Create an exchange rate entry' })
  @Permissions('accounting:manage')
  createRate(
    @TenantId() tenantId: string,
    @Body() dto: CreateExchangeRateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.currencyService.createRate(tenantId, dto, { userId: user.id, tenantId });
  }

  @Get('exchange-rates')
  @ApiOperation({ summary: 'Get exchange rate for a currency pair on a given date' })
  @Permissions('accounting:view')
  getRate(@TenantId() tenantId: string, @Query() query: QueryExchangeRateDto) {
    return this.currencyService.getRateByQuery(tenantId, query.from, query.to, query.date);
  }

  @Get('exchange-rates/history')
  @ApiOperation({ summary: 'Get exchange rate history for a currency' })
  @Permissions('accounting:view')
  getRateHistory(@TenantId() tenantId: string, @Query() query: RateHistoryQueryDto) {
    return this.currencyService.getRateHistory(tenantId, query.currencyId);
  }
}
