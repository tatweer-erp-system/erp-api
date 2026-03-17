import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LoyaltySharedService } from './loyalty-shared.service';
import { LoyaltyTransactionType } from '@/common/enums/pos.enums';

jest.mock('uuid', () => ({
  v7: jest.fn().mockReturnValue('mock-uuid'),
}));

describe('LoyaltySharedService', () => {
  let service: LoyaltySharedService;
  let programsRepository: Record<string, jest.Mock>;
  let accountsRepository: Record<string, jest.Mock>;
  let transactionsRepository: Record<string, jest.Mock>;
  let tiersRepository: Record<string, jest.Mock>;

  const tenantId = 'tenant-001';
  const customerId = 'cust-001';
  const orderId = 'order-001';
  const accountId = 'acc-001';
  const programId = 'prog-001';
  const mockTransaction = {} as any;

  const makeProgram = (overrides: Record<string, unknown> = {}) => ({
    id: programId,
    isActive: true,
    pointsPerCurrency: 1,
    currencyPerPoint: 0.1,
    maxRedeemPct: 50,
    expiryDays: 365,
    ...overrides,
  });

  const makeAccount = (overrides: Record<string, unknown> = {}) => ({
    id: accountId,
    customerId,
    programId,
    currentPoints: 500,
    lifetimePoints: 1000,
    version: 1,
    ...overrides,
  });

  beforeEach(() => {
    programsRepository = {
      findOne: jest.fn(),
      findById: jest.fn(),
    };

    accountsRepository = {
      findOrCreate: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      rawQuery: jest.fn(),
    };

    transactionsRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
    };

    tiersRepository = {
      findAllRaw: jest.fn().mockResolvedValue([]),
    };

    service = new LoyaltySharedService(
      programsRepository as any,
      accountsRepository as any,
      transactionsRepository as any,
      tiersRepository as any,
    );
  });

  // ─── earn() ───────────────────────────────────────────────────────────

  describe('earn()', () => {
    it('should silently return if no active program exists', async () => {
      programsRepository.findOne.mockResolvedValue(null);

      await service.earn(tenantId, customerId, orderId, 100, mockTransaction);

      expect(transactionsRepository.create).not.toHaveBeenCalled();
      expect(accountsRepository.rawQuery).not.toHaveBeenCalled();
    });

    it('should calculate points = floor(orderTotal * pointsPerCurrency)', async () => {
      const program = makeProgram({ pointsPerCurrency: 2 });
      programsRepository.findOne.mockResolvedValue(program);
      accountsRepository.findOrCreate.mockResolvedValue([makeAccount()]);
      accountsRepository.rawQuery.mockResolvedValue(undefined);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 700 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.earn(tenantId, customerId, orderId, 150.7, mockTransaction);

      // floor(150.7 * 2 * 1.0) = floor(301.4) = 301
      expect(accountsRepository.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining('"currentPoints" = "currentPoints" + :points'),
        expect.objectContaining({ points: 301 }),
        mockTransaction,
      );
    });

    it('should apply tier earnMultiplier', async () => {
      const program = makeProgram({ pointsPerCurrency: 1 });
      const tiers = [
        { id: 2, minPoints: 500, earnMultiplier: 2.0 },
        { id: 1, minPoints: 0, earnMultiplier: 1.0 },
      ];
      programsRepository.findOne.mockResolvedValue(program);
      tiersRepository.findAllRaw.mockResolvedValue(tiers);
      accountsRepository.findOrCreate.mockResolvedValue([makeAccount({ lifetimePoints: 600 })]);
      accountsRepository.rawQuery.mockResolvedValue(undefined);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 800 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.earn(tenantId, customerId, orderId, 100, mockTransaction);

      // floor(100 * 1 * 2.0) = 200
      expect(accountsRepository.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining('"currentPoints" = "currentPoints" + :points'),
        expect.objectContaining({ points: 200 }),
        mockTransaction,
      );
    });

    it('should use earnMultiplier = 1.0 when no tier matches', async () => {
      const program = makeProgram({ pointsPerCurrency: 1 });
      const tiers = [{ id: 1, minPoints: 9999, earnMultiplier: 3.0 }];
      programsRepository.findOne.mockResolvedValue(program);
      tiersRepository.findAllRaw.mockResolvedValue(tiers);
      accountsRepository.findOrCreate.mockResolvedValue([makeAccount({ lifetimePoints: 50 })]);
      accountsRepository.rawQuery.mockResolvedValue(undefined);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 150 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.earn(tenantId, customerId, orderId, 100, mockTransaction);

      // floor(100 * 1 * 1.0) = 100
      expect(accountsRepository.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining('"currentPoints" = "currentPoints" + :points'),
        expect.objectContaining({ points: 100 }),
        mockTransaction,
      );
    });

    it('should silently return when calculated points <= 0', async () => {
      const program = makeProgram({ pointsPerCurrency: 0 });
      programsRepository.findOne.mockResolvedValue(program);
      accountsRepository.findOrCreate.mockResolvedValue([makeAccount()]);

      await service.earn(tenantId, customerId, orderId, 100, mockTransaction);

      expect(accountsRepository.rawQuery).not.toHaveBeenCalled();
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should create loyalty transaction with type EARN', async () => {
      const program = makeProgram({ pointsPerCurrency: 1, expiryDays: 30 });
      programsRepository.findOne.mockResolvedValue(program);
      accountsRepository.findOrCreate.mockResolvedValue([makeAccount()]);
      accountsRepository.rawQuery.mockResolvedValue(undefined);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 600 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.earn(tenantId, customerId, orderId, 100, mockTransaction);

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId,
          orderId,
          type: LoyaltyTransactionType.EARN,
          points: 100,
          balanceAfter: 600,
        }),
        { transaction: mockTransaction },
      );
    });

    it('should set expiresAt when program has expiryDays', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const program = makeProgram({ pointsPerCurrency: 1, expiryDays: 90 });
      programsRepository.findOne.mockResolvedValue(program);
      accountsRepository.findOrCreate.mockResolvedValue([makeAccount()]);
      accountsRepository.rawQuery.mockResolvedValue(undefined);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 600 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.earn(tenantId, customerId, orderId, 100, mockTransaction);

      const expectedExpiry = new Date(now + 90 * 24 * 60 * 60 * 1000);
      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: expectedExpiry }),
        { transaction: mockTransaction },
      );

      jest.restoreAllMocks();
    });

    it('should set expiresAt to null when program has no expiryDays', async () => {
      const program = makeProgram({ pointsPerCurrency: 1, expiryDays: null });
      programsRepository.findOne.mockResolvedValue(program);
      accountsRepository.findOrCreate.mockResolvedValue([makeAccount()]);
      accountsRepository.rawQuery.mockResolvedValue(undefined);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 600 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.earn(tenantId, customerId, orderId, 100, mockTransaction);

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: null }),
        { transaction: mockTransaction },
      );
    });

    it('should update tier when lifetimePoints crosses a tier threshold', async () => {
      const tiers = [
        { id: 2, minPoints: 500, earnMultiplier: 2.0 },
        { id: 1, minPoints: 0, earnMultiplier: 1.0 },
      ];
      programsRepository.findOne.mockResolvedValue(makeProgram({ pointsPerCurrency: 1 }));
      tiersRepository.findAllRaw.mockResolvedValue(tiers);
      // Account starts below 500 lifetime
      accountsRepository.findOrCreate.mockResolvedValue([makeAccount({ lifetimePoints: 400 })]);
      accountsRepository.rawQuery.mockResolvedValue(undefined);
      // After earn: lifetimePoints = 500 -> tier 2 matches
      accountsRepository.findById.mockResolvedValue(
        makeAccount({ currentPoints: 500, lifetimePoints: 500 }),
      );
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.earn(tenantId, customerId, orderId, 100, mockTransaction);

      // Should have a rawQuery call for tier update (the 2nd rawQuery call)
      const rawQueryCalls = accountsRepository.rawQuery.mock.calls;
      const tierUpdateCall = rawQueryCalls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' && (call[0] as string).includes('"tierId"'),
      );
      expect(tierUpdateCall).toBeDefined();
      expect(tierUpdateCall[1]).toEqual(expect.objectContaining({ tierId: 2 }));
    });

    it('should not update tier when tier does not change', async () => {
      const tiers = [
        { id: 2, minPoints: 500, earnMultiplier: 2.0 },
        { id: 1, minPoints: 0, earnMultiplier: 1.0 },
      ];
      programsRepository.findOne.mockResolvedValue(makeProgram({ pointsPerCurrency: 1 }));
      tiersRepository.findAllRaw.mockResolvedValue(tiers);
      // Already in tier 2
      accountsRepository.findOrCreate.mockResolvedValue([makeAccount({ lifetimePoints: 600 })]);
      accountsRepository.rawQuery.mockResolvedValue(undefined);
      accountsRepository.findById.mockResolvedValue(
        makeAccount({ currentPoints: 700, lifetimePoints: 700 }),
      );
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.earn(tenantId, customerId, orderId, 100, mockTransaction);

      // Only one rawQuery call for point update, no tier update
      const rawQueryCalls = accountsRepository.rawQuery.mock.calls;
      const tierUpdateCall = rawQueryCalls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' && (call[0] as string).includes('"tierId"'),
      );
      expect(tierUpdateCall).toBeUndefined();
    });

    it('should find or create account with correct defaults', async () => {
      programsRepository.findOne.mockResolvedValue(makeProgram({ pointsPerCurrency: 1 }));
      accountsRepository.findOrCreate.mockResolvedValue([makeAccount()]);
      accountsRepository.rawQuery.mockResolvedValue(undefined);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 600 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.earn(tenantId, customerId, orderId, 100, mockTransaction);

      expect(accountsRepository.findOrCreate).toHaveBeenCalledWith(
        { customerId, programId },
        expect.objectContaining({
          customerId,
          programId,
          currentPoints: 0,
          lifetimePoints: 0,
          version: 0,
        }),
        { tenantId, transaction: mockTransaction },
      );
    });
  });

  // ─── redeem() ─────────────────────────────────────────────────────────

  describe('redeem()', () => {
    it('should throw NotFoundException when account not found', async () => {
      accountsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.redeem(tenantId, customerId, orderId, 100, 200, mockTransaction),
      ).rejects.toThrow(NotFoundException);
    });

    it('should cap points by maxRedeemPct of order total', async () => {
      const program = makeProgram({ maxRedeemPct: 50, currencyPerPoint: 0.1 });
      const account = makeAccount({ currentPoints: 5000 });
      accountsRepository.findOne.mockResolvedValue(account);
      programsRepository.findById.mockResolvedValue(program);
      // maxPointsAllowed = floor((200 * 50) / 100 / 0.1) = floor(1000) = 1000
      // pointsToUse = min(5000, 1000, 5000) = 1000
      accountsRepository.rawQuery.mockResolvedValue([{ id: accountId }]);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 4000 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      const result = await service.redeem(
        tenantId,
        customerId,
        orderId,
        5000,
        200,
        mockTransaction,
      );

      expect(result.pointsUsed).toBe(1000);
      // sarValue = round(1000 * 0.1 * 100) / 100 = 100
      expect(result.sarValue).toBe(100);
    });

    it('should cap points by available balance when balance < requested', async () => {
      const program = makeProgram({ maxRedeemPct: 100, currencyPerPoint: 0.1 });
      const account = makeAccount({ currentPoints: 50 });
      accountsRepository.findOne.mockResolvedValue(account);
      programsRepository.findById.mockResolvedValue(program);
      // maxPointsAllowed = floor((200 * 100) / 100 / 0.1) = 2000
      // pointsToUse = min(500, 2000, 50) = 50
      accountsRepository.rawQuery.mockResolvedValue([{ id: accountId }]);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 0 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      const result = await service.redeem(tenantId, customerId, orderId, 500, 200, mockTransaction);

      expect(result.pointsUsed).toBe(50);
      expect(result.sarValue).toBe(5); // 50 * 0.1
    });

    it('should return { pointsUsed: 0, sarValue: 0 } when pointsToUse <= 0', async () => {
      const program = makeProgram({ maxRedeemPct: 0, currencyPerPoint: 0.1 });
      const account = makeAccount({ currentPoints: 100 });
      accountsRepository.findOne.mockResolvedValue(account);
      programsRepository.findById.mockResolvedValue(program);

      const result = await service.redeem(tenantId, customerId, orderId, 100, 200, mockTransaction);

      expect(result).toEqual({ pointsUsed: 0, sarValue: 0 });
    });

    it('should throw BadRequestException on concurrent deduction race condition', async () => {
      const program = makeProgram({ maxRedeemPct: 100, currencyPerPoint: 0.1 });
      const account = makeAccount({ currentPoints: 100 });
      accountsRepository.findOne.mockResolvedValue(account);
      programsRepository.findById.mockResolvedValue(program);
      // Simulating a race: rawQuery returns empty (another transaction drained points)
      accountsRepository.rawQuery.mockResolvedValue([]);

      await expect(
        service.redeem(tenantId, customerId, orderId, 50, 200, mockTransaction),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create transaction with type REDEEM and negative points', async () => {
      const program = makeProgram({ maxRedeemPct: 100, currencyPerPoint: 0.5 });
      const account = makeAccount({ currentPoints: 200 });
      accountsRepository.findOne.mockResolvedValue(account);
      programsRepository.findById.mockResolvedValue(program);
      accountsRepository.rawQuery.mockResolvedValue([{ id: accountId }]);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 100 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.redeem(tenantId, customerId, orderId, 100, 500, mockTransaction);

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId,
          orderId,
          type: LoyaltyTransactionType.REDEEM,
          points: -100,
          balanceAfter: 100,
        }),
        { transaction: mockTransaction },
      );
    });

    it('should calculate sarValue with 2 decimal precision', async () => {
      const program = makeProgram({ maxRedeemPct: 100, currencyPerPoint: 0.03 });
      const account = makeAccount({ currentPoints: 1000 });
      accountsRepository.findOne.mockResolvedValue(account);
      programsRepository.findById.mockResolvedValue(program);
      accountsRepository.rawQuery.mockResolvedValue([{ id: accountId }]);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 900 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      // maxPointsAllowed = floor((100 * 100) / 100 / 0.03) = floor(3333.33) = 3333
      // pointsToUse = min(100, 3333, 1000) = 100
      const result = await service.redeem(tenantId, customerId, orderId, 100, 100, mockTransaction);

      // sarValue = round(100 * 0.03 * 100) / 100 = round(300) / 100 = 3
      expect(result.sarValue).toBe(3);
    });

    it('should use the minimum of requestedPoints, maxPointsAllowed, and currentPoints', async () => {
      const program = makeProgram({ maxRedeemPct: 80, currencyPerPoint: 0.5 });
      const account = makeAccount({ currentPoints: 300 });
      accountsRepository.findOne.mockResolvedValue(account);
      programsRepository.findById.mockResolvedValue(program);
      accountsRepository.rawQuery.mockResolvedValue([{ id: accountId }]);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 100 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      // maxPointsAllowed = floor((100 * 80) / 100 / 0.5) = floor(160) = 160
      // pointsToUse = min(200, 160, 300) = 160
      const result = await service.redeem(tenantId, customerId, orderId, 200, 100, mockTransaction);

      expect(result.pointsUsed).toBe(160);
    });
  });

  // ─── reverseEarn() ────────────────────────────────────────────────────

  describe('reverseEarn()', () => {
    it('should silently return if no earn transaction found for order', async () => {
      transactionsRepository.findOne.mockResolvedValue(null);

      await service.reverseEarn(tenantId, orderId, mockTransaction);

      expect(accountsRepository.rawQuery).not.toHaveBeenCalled();
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should reverse the earned points from original transaction', async () => {
      const earnTx = {
        accountId,
        orderId,
        type: LoyaltyTransactionType.EARN,
        points: 150,
      };
      transactionsRepository.findOne.mockResolvedValue(earnTx);
      accountsRepository.rawQuery.mockResolvedValue(undefined);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 350 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.reverseEarn(tenantId, orderId, mockTransaction);

      expect(accountsRepository.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining('GREATEST("currentPoints" - :points, 0)'),
        expect.objectContaining({ points: 150, accountId }),
        mockTransaction,
      );
    });

    it('should create REFUND transaction with negative points', async () => {
      const earnTx = {
        accountId,
        orderId,
        type: LoyaltyTransactionType.EARN,
        points: 100,
      };
      transactionsRepository.findOne.mockResolvedValue(earnTx);
      accountsRepository.rawQuery.mockResolvedValue(undefined);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 400 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.reverseEarn(tenantId, orderId, mockTransaction);

      expect(transactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId,
          orderId,
          type: LoyaltyTransactionType.REFUND,
          points: -100,
          balanceAfter: 400,
        }),
        { transaction: mockTransaction },
      );
    });

    it('should silently return when points to reverse <= 0', async () => {
      const earnTx = {
        accountId,
        orderId,
        type: LoyaltyTransactionType.EARN,
        points: 0,
      };
      transactionsRepository.findOne.mockResolvedValue(earnTx);

      await service.reverseEarn(tenantId, orderId, mockTransaction);

      expect(accountsRepository.rawQuery).not.toHaveBeenCalled();
      expect(transactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should clamp account balance to 0 (never go negative)', async () => {
      const earnTx = {
        accountId,
        orderId,
        type: LoyaltyTransactionType.EARN,
        points: 999,
      };
      transactionsRepository.findOne.mockResolvedValue(earnTx);
      accountsRepository.rawQuery.mockResolvedValue(undefined);
      accountsRepository.findById.mockResolvedValue(makeAccount({ currentPoints: 0 }));
      transactionsRepository.create.mockResolvedValue(undefined);

      await service.reverseEarn(tenantId, orderId, mockTransaction);

      expect(accountsRepository.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining('GREATEST("currentPoints" - :points, 0)'),
        expect.objectContaining({ points: 999 }),
        mockTransaction,
      );
    });
  });
});
