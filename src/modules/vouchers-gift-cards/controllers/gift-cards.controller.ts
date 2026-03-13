import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GiftCardsService } from '../services/gift-cards.service';
import { IssueGiftCardDto } from '../dto/issue-gift-card.dto';
import { CheckBalanceDto } from '../dto/check-balance.dto';
import { RedeemGiftCardDto } from '../dto/redeem-gift-card.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Gift Cards')
@ApiBearerAuth()
@ModuleFeature('vouchers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('gift-cards')
export class GiftCardsController {
  constructor(private readonly giftCardsService: GiftCardsService) {}

  @Post()
  @ApiOperation({ summary: 'Issue a new gift card' })
  @Permissions('pos:orders')
  issue(
    @TenantId() tenantId: string,
    @Body() dto: IssueGiftCardDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.giftCardsService.issue(tenantId, dto, { userId: user.id, tenantId });
  }

  @Post('check-balance')
  @Public()
  @ApiOperation({ summary: 'Check gift card balance' })
  checkBalance(@Body() dto: CheckBalanceDto) {
    return this.giftCardsService.checkBalance(dto.code, dto.tenantId);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem a gift card' })
  @Permissions('pos:orders')
  async redeem(
    @TenantId() tenantId: string,
    @Body() dto: RedeemGiftCardDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const auditContext = { userId: user.id, tenantId };
    const transaction = await this.giftCardsService.createTransaction();

    try {
      const result = await this.giftCardsService.redeem(
        tenantId,
        dto.code,
        dto.amount,
        dto.orderId ?? null,
        auditContext,
        transaction,
      );
      await transaction.commit();
      return result;
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
}
