import { VoucherGiftCardSharedService } from './voucher-gift-card-shared.service';
import { DiscountType } from '@/common/enums/pos.enums';

jest.mock('uuid', () => ({
  v7: jest.fn().mockReturnValue('mock-uuid'),
}));

describe('VoucherGiftCardSharedService', () => {
  let service: VoucherGiftCardSharedService;
  let vouchersRepository: Record<string, jest.Mock>;
  let voucherRedemptionsRepository: Record<string, jest.Mock>;
  let giftCardsRepository: Record<string, jest.Mock>;
  let giftCardTransactionsRepository: Record<string, jest.Mock>;

  const tenantId = 'tenant-001';
  const mockTransaction = {} as any;

  const makeVoucher = (overrides: Record<string, unknown> = {}) => ({
    id: 'voucher-001',
    code: 'SAVE10',
    isActive: true,
    discountType: DiscountType.PERCENT,
    discountValue: 10,
    maxDiscountAmount: null,
    minOrderAmount: 0,
    maxUses: null,
    usedCount: 0,
    customerId: null,
    maxUsesPerCustomer: null,
    validFrom: null,
    validUntil: null,
    ...overrides,
  });

  const makeGiftCard = (overrides: Record<string, unknown> = {}) => ({
    id: 'gc-001',
    code: 'GIFT100',
    currentBalance: 100,
    ...overrides,
  });

  beforeEach(() => {
    vouchersRepository = {
      findOne: jest.fn(),
      rawQuery: jest.fn(),
    };

    voucherRedemptionsRepository = {
      create: jest.fn(),
      count: jest.fn(),
    };

    giftCardsRepository = {
      findOne: jest.fn(),
      rawQuery: jest.fn(),
    };

    giftCardTransactionsRepository = {
      create: jest.fn(),
    };

    service = new VoucherGiftCardSharedService(
      vouchersRepository as any,
      voucherRedemptionsRepository as any,
      giftCardsRepository as any,
      giftCardTransactionsRepository as any,
    );
  });

  // ─── validateVoucher() ────────────────────────────────────────────────

  describe('validateVoucher()', () => {
    it('should return invalid when voucher not found', async () => {
      vouchersRepository.findOne.mockResolvedValue(null);

      const result = await service.validateVoucher(tenantId, 'BADCODE', 100);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return invalid when voucher is inactive', async () => {
      vouchersRepository.findOne.mockResolvedValue(makeVoucher({ isActive: false }));

      const result = await service.validateVoucher(tenantId, 'SAVE10', 100);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return invalid when voucher has not started yet (validFrom)', async () => {
      vouchersRepository.findOne.mockResolvedValue(makeVoucher({ validFrom: '2099-01-01' }));

      const result = await service.validateVoucher(tenantId, 'SAVE10', 100);

      expect(result.valid).toBe(false);
    });

    it('should return invalid when voucher is expired (validUntil)', async () => {
      vouchersRepository.findOne.mockResolvedValue(makeVoucher({ validUntil: '2020-01-01' }));

      const result = await service.validateVoucher(tenantId, 'SAVE10', 100);

      expect(result.valid).toBe(false);
    });

    it('should return invalid when maxUses is exhausted', async () => {
      vouchersRepository.findOne.mockResolvedValue(makeVoucher({ maxUses: 5, usedCount: 5 }));

      const result = await service.validateVoucher(tenantId, 'SAVE10', 100);

      expect(result.valid).toBe(false);
    });

    it('should allow when usedCount < maxUses', async () => {
      vouchersRepository.findOne.mockResolvedValue(makeVoucher({ maxUses: 5, usedCount: 4 }));

      const result = await service.validateVoucher(tenantId, 'SAVE10', 100);

      expect(result.valid).toBe(true);
    });

    it('should return invalid when voucher is assigned to another customer', async () => {
      vouchersRepository.findOne.mockResolvedValue(makeVoucher({ customerId: 'cust-other' }));

      const result = await service.validateVoucher(tenantId, 'SAVE10', 100, 'cust-me');

      expect(result.valid).toBe(false);
    });

    it('should allow when voucher customer matches provided customerId', async () => {
      vouchersRepository.findOne.mockResolvedValue(makeVoucher({ customerId: 'cust-001' }));

      const result = await service.validateVoucher(tenantId, 'SAVE10', 100, 'cust-001');

      expect(result.valid).toBe(true);
    });

    it('should return invalid when customer exceeded maxUsesPerCustomer', async () => {
      vouchersRepository.findOne.mockResolvedValue(makeVoucher({ maxUsesPerCustomer: 2 }));
      voucherRedemptionsRepository.count.mockResolvedValue(2);

      const result = await service.validateVoucher(tenantId, 'SAVE10', 100, 'cust-001');

      expect(result.valid).toBe(false);
    });

    it('should return invalid when order total < minOrderAmount', async () => {
      vouchersRepository.findOne.mockResolvedValue(makeVoucher({ minOrderAmount: 200 }));

      const result = await service.validateVoucher(tenantId, 'SAVE10', 150);

      expect(result.valid).toBe(false);
    });

    it('should calculate percentage discount correctly', async () => {
      vouchersRepository.findOne.mockResolvedValue(
        makeVoucher({ discountType: DiscountType.PERCENT, discountValue: 15 }),
      );

      const result = await service.validateVoucher(tenantId, 'SAVE10', 200);

      expect(result.valid).toBe(true);
      // 200 * 15 / 100 = 30
      expect(result.discountAmount).toBe(30);
    });

    it('should cap percentage discount by maxDiscountAmount', async () => {
      vouchersRepository.findOne.mockResolvedValue(
        makeVoucher({
          discountType: DiscountType.PERCENT,
          discountValue: 50,
          maxDiscountAmount: 20,
        }),
      );

      const result = await service.validateVoucher(tenantId, 'SAVE10', 200);

      expect(result.valid).toBe(true);
      // raw = 200 * 50 / 100 = 100, capped at 20
      expect(result.discountAmount).toBe(20);
    });

    it('should calculate fixed discount correctly', async () => {
      vouchersRepository.findOne.mockResolvedValue(
        makeVoucher({ discountType: DiscountType.FIXED, discountValue: 25 }),
      );

      const result = await service.validateVoucher(tenantId, 'SAVE10', 200);

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(25);
    });

    it('should cap fixed discount at orderTotal', async () => {
      vouchersRepository.findOne.mockResolvedValue(
        makeVoucher({ discountType: DiscountType.FIXED, discountValue: 300 }),
      );

      const result = await service.validateVoucher(tenantId, 'SAVE10', 200);

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(200);
    });

    it('should round discount to 2 decimal places', async () => {
      vouchersRepository.findOne.mockResolvedValue(
        makeVoucher({ discountType: DiscountType.PERCENT, discountValue: 33 }),
      );

      // 99.99 * 33 / 100 = 32.9967
      const result = await service.validateVoucher(tenantId, 'SAVE10', 99.99);

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(33);
    });

    it('should skip maxUsesPerCustomer check when no customerId provided', async () => {
      vouchersRepository.findOne.mockResolvedValue(makeVoucher({ maxUsesPerCustomer: 1 }));

      const result = await service.validateVoucher(tenantId, 'SAVE10', 100);

      expect(result.valid).toBe(true);
      expect(voucherRedemptionsRepository.count).not.toHaveBeenCalled();
    });

    it('should return voucherId on valid result', async () => {
      vouchersRepository.findOne.mockResolvedValue(makeVoucher());

      const result = await service.validateVoucher(tenantId, 'SAVE10', 100);

      expect(result.valid).toBe(true);
      expect(result.voucherId).toBe('voucher-001');
    });
  });

  // ─── redeemVoucher() ──────────────────────────────────────────────────

  describe('redeemVoucher()', () => {
    it('should create redemption record', async () => {
      voucherRedemptionsRepository.create.mockResolvedValue(undefined);
      vouchersRepository.rawQuery.mockResolvedValue(undefined);

      await service.redeemVoucher('voucher-001', 'order-001', 'cust-001', 25.5, mockTransaction);

      expect(voucherRedemptionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          voucherId: 'voucher-001',
          orderId: 'order-001',
          customerId: 'cust-001',
          discountApplied: 25.5,
        }),
        { transaction: mockTransaction },
      );
    });

    it('should increment usedCount on voucher', async () => {
      voucherRedemptionsRepository.create.mockResolvedValue(undefined);
      vouchersRepository.rawQuery.mockResolvedValue(undefined);

      await service.redeemVoucher('voucher-001', 'order-001', null, 10, mockTransaction);

      expect(vouchersRepository.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining('"usedCount" = "usedCount" + 1'),
        expect.objectContaining({ voucherId: 'voucher-001' }),
        mockTransaction,
      );
    });

    it('should allow null customerId for walk-in sales', async () => {
      voucherRedemptionsRepository.create.mockResolvedValue(undefined);
      vouchersRepository.rawQuery.mockResolvedValue(undefined);

      await service.redeemVoucher('voucher-001', 'order-001', null, 10, mockTransaction);

      expect(voucherRedemptionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: null }),
        { transaction: mockTransaction },
      );
    });
  });

  // ─── redeemGiftCard() ─────────────────────────────────────────────────

  describe('redeemGiftCard()', () => {
    it('should return full remainingToPay when gift card not found', async () => {
      giftCardsRepository.findOne.mockResolvedValue(null);

      const result = await service.redeemGiftCard(
        tenantId,
        'BADCODE',
        100,
        'order-001',
        mockTransaction,
      );

      expect(result).toEqual({ amountDeducted: 0, remainingToPay: 100 });
    });

    it('should return full remainingToPay when gift card balance is 0', async () => {
      giftCardsRepository.findOne.mockResolvedValue(makeGiftCard({ currentBalance: 0 }));

      const result = await service.redeemGiftCard(
        tenantId,
        'GIFT100',
        50,
        'order-001',
        mockTransaction,
      );

      expect(result).toEqual({ amountDeducted: 0, remainingToPay: 50 });
    });

    it('should deduct full amount when balance >= amount', async () => {
      giftCardsRepository.findOne.mockResolvedValue(makeGiftCard({ currentBalance: 100 }));
      giftCardsRepository.rawQuery.mockResolvedValue([{ id: 'gc-001' }]);
      giftCardTransactionsRepository.create.mockResolvedValue(undefined);

      const result = await service.redeemGiftCard(
        tenantId,
        'GIFT100',
        75,
        'order-001',
        mockTransaction,
      );

      expect(result.amountDeducted).toBe(75);
      expect(result.remainingToPay).toBe(0);
    });

    it('should do partial redemption when balance < amount', async () => {
      giftCardsRepository.findOne.mockResolvedValue(makeGiftCard({ currentBalance: 30 }));
      giftCardsRepository.rawQuery.mockResolvedValue([{ id: 'gc-001' }]);
      giftCardTransactionsRepository.create.mockResolvedValue(undefined);

      const result = await service.redeemGiftCard(
        tenantId,
        'GIFT100',
        100,
        'order-001',
        mockTransaction,
      );

      expect(result.amountDeducted).toBe(30);
      expect(result.remainingToPay).toBe(70);
    });

    it('should create gift card transaction with negative amount', async () => {
      giftCardsRepository.findOne.mockResolvedValue(makeGiftCard({ currentBalance: 100 }));
      giftCardsRepository.rawQuery.mockResolvedValue([{ id: 'gc-001' }]);
      giftCardTransactionsRepository.create.mockResolvedValue(undefined);

      await service.redeemGiftCard(tenantId, 'GIFT100', 60, 'order-001', mockTransaction);

      expect(giftCardTransactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          giftCardId: 'gc-001',
          type: 'redeem',
          amount: -60,
          balanceAfter: 40,
          orderId: 'order-001',
        }),
        { transaction: mockTransaction },
      );
    });

    it('should handle race condition fallback (concurrent drain)', async () => {
      giftCardsRepository.findOne.mockResolvedValue(makeGiftCard({ currentBalance: 50 }));
      // First rawQuery (optimistic) fails
      giftCardsRepository.rawQuery
        .mockResolvedValueOnce([])
        // Second rawQuery (fallback to drain remaining)
        .mockResolvedValueOnce([{ currentBalance: '0' }]);
      giftCardTransactionsRepository.create.mockResolvedValue(undefined);

      const result = await service.redeemGiftCard(
        tenantId,
        'GIFT100',
        100,
        'order-001',
        mockTransaction,
      );

      // Falls back to deducting whatever was available (50)
      expect(result.amountDeducted).toBe(50);
      expect(result.remainingToPay).toBe(50);
    });

    it('should round remainingToPay to 2 decimal places', async () => {
      giftCardsRepository.findOne.mockResolvedValue(makeGiftCard({ currentBalance: 33.33 }));
      giftCardsRepository.rawQuery.mockResolvedValue([{ id: 'gc-001' }]);
      giftCardTransactionsRepository.create.mockResolvedValue(undefined);

      const result = await service.redeemGiftCard(
        tenantId,
        'GIFT100',
        100,
        'order-001',
        mockTransaction,
      );

      expect(result.amountDeducted).toBe(33.33);
      expect(result.remainingToPay).toBe(66.67);
    });

    it('should deduct exactly the amount when balance equals amount', async () => {
      giftCardsRepository.findOne.mockResolvedValue(makeGiftCard({ currentBalance: 100 }));
      giftCardsRepository.rawQuery.mockResolvedValue([{ id: 'gc-001' }]);
      giftCardTransactionsRepository.create.mockResolvedValue(undefined);

      const result = await service.redeemGiftCard(
        tenantId,
        'GIFT100',
        100,
        'order-001',
        mockTransaction,
      );

      expect(result.amountDeducted).toBe(100);
      expect(result.remainingToPay).toBe(0);
    });
  });
});
