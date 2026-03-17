/* eslint-disable @typescript-eslint/no-unused-vars */
import { NotFoundException } from '@nestjs/common';

// Mock all repository imports
jest.mock('@/database/sql/repositories/shifts.repository', () => ({
  ShiftsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/shift-working-days.repository', () => ({
  ShiftWorkingDaysRepository: jest.fn(),
}));

import { ShiftsService } from './shifts.service';

describe('ShiftsService', () => {
  let service: ShiftsService;
  let shiftsRepository: Record<string, jest.Mock>;
  let shiftWorkingDaysRepository: Record<string, jest.Mock>;

  const tenantId = 'tenant-1';
  const shiftId = 'shift-1';
  const userId = 'user-1';
  const auditContext = { userId };

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const mockShift = {
    id: shiftId,
    nameEn: 'Morning Shift',
    nameAr: 'وردية صباحية',
    descriptionEn: null,
    descriptionAr: null,
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 60,
    isOvernight: false,
    workingDays: [1, 2, 3, 4, 5],
    isActive: true,
    toJSON: function () {
      const { toJSON, ...rest } = this;
      return rest;
    },
  };

  const mockWorkingDays = [
    { id: 'wd-1', shiftId, dayOfWeek: 1 },
    { id: 'wd-2', shiftId, dayOfWeek: 2 },
    { id: 'wd-3', shiftId, dayOfWeek: 3 },
    { id: 'wd-4', shiftId, dayOfWeek: 4 },
    { id: 'wd-5', shiftId, dayOfWeek: 5 },
  ];

  beforeEach(() => {
    shiftsRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByIdOrNull: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
    };

    shiftWorkingDaysRepository = {
      bulkCreate: jest.fn(),
      findAllRaw: jest.fn(),
      hardDelete: jest.fn(),
      createTransaction: jest.fn().mockResolvedValue(mockTransaction),
    };

    service = new ShiftsService(shiftsRepository as any, shiftWorkingDaysRepository as any);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto = {
      nameEn: 'Morning Shift',
      nameAr: 'وردية صباحية',
      startTime: '08:00',
      endTime: '16:00',
      workingDays: [0, 1, 2, 3, 4], // Sun-Thu
    };

    it('should create a shift and insert working days into shift_working_days table', async () => {
      shiftsRepository.create.mockResolvedValue(mockShift);
      shiftWorkingDaysRepository.bulkCreate.mockResolvedValue(undefined);
      shiftWorkingDaysRepository.findAllRaw.mockResolvedValue(
        [0, 1, 2, 3, 4].map((d) => ({ dayOfWeek: d })),
      );

      const result = await service.create(tenantId, createDto as any, auditContext);

      expect(shiftsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nameEn: 'Morning Shift',
          nameAr: 'وردية صباحية',
          startTime: '08:00',
          endTime: '16:00',
        }),
        expect.objectContaining({ tenantId, auditContext, transaction: mockTransaction }),
      );

      expect(shiftWorkingDaysRepository.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ shiftId, dayOfWeek: 0 }),
            expect.objectContaining({ shiftId, dayOfWeek: 4 }),
          ]),
          tenantId,
          auditContext,
          transaction: mockTransaction,
        }),
      );

      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should default workingDays to [1,2,3,4,5] when not provided', async () => {
      const dtoNoWorkingDays = {
        nameEn: 'Default Shift',
        nameAr: 'وردية افتراضية',
        startTime: '08:00',
        endTime: '16:00',
      };
      shiftsRepository.create.mockResolvedValue({ ...mockShift, id: 'shift-2' });
      shiftWorkingDaysRepository.bulkCreate.mockResolvedValue(undefined);
      shiftWorkingDaysRepository.findAllRaw.mockResolvedValue(
        [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d })),
      );

      await service.create(tenantId, dtoNoWorkingDays as any, auditContext);

      expect(shiftWorkingDaysRepository.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ dayOfWeek: 1 }),
            expect.objectContaining({ dayOfWeek: 5 }),
          ]),
        }),
      );
    });

    it('should rollback transaction on error', async () => {
      shiftsRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create(tenantId, createDto as any, auditContext)).rejects.toThrow(
        'DB error',
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should default breakMinutes to 60 when not provided', async () => {
      shiftsRepository.create.mockResolvedValue(mockShift);
      shiftWorkingDaysRepository.bulkCreate.mockResolvedValue(undefined);
      shiftWorkingDaysRepository.findAllRaw.mockResolvedValue([]);

      await service.create(tenantId, createDto as any, auditContext);

      expect(shiftsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ breakMinutes: 60 }),
        expect.any(Object),
      );
    });
  });

  // ── getWorkingDays ─────────────────────────────────────────────────────────

  describe('getWorkingDays()', () => {
    it('should return working days from shift_working_days table sorted by dayOfWeek', async () => {
      shiftWorkingDaysRepository.findAllRaw.mockResolvedValue(mockWorkingDays);

      const result = await service.getWorkingDays(tenantId, shiftId);

      expect(result).toEqual([1, 2, 3, 4, 5]);
      expect(shiftWorkingDaysRepository.findAllRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { shiftId },
          tenantId,
          order: [['dayOfWeek', 'ASC']],
        }),
      );
    });

    it('should return empty array when no working days configured', async () => {
      shiftWorkingDaysRepository.findAllRaw.mockResolvedValue([]);

      const result = await service.getWorkingDays(tenantId, shiftId);

      expect(result).toEqual([]);
    });
  });

  // ── replaceWorkingDays ─────────────────────────────────────────────────────

  describe('replaceWorkingDays()', () => {
    it('should delete old working days and insert new ones', async () => {
      shiftsRepository.findByIdOrNull.mockResolvedValue(mockShift);
      shiftWorkingDaysRepository.findAllRaw
        .mockResolvedValueOnce(mockWorkingDays) // existing days to delete
        .mockResolvedValueOnce(
          // new days after insert (for getWorkingDays)
          [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d })),
        );
      shiftWorkingDaysRepository.hardDelete.mockResolvedValue(undefined);
      shiftWorkingDaysRepository.bulkCreate.mockResolvedValue(undefined);
      shiftsRepository.update.mockResolvedValue(undefined);

      const result = await service.replaceWorkingDays(
        tenantId,
        shiftId,
        [0, 1, 2, 3, 4, 5, 6],
        auditContext,
      );

      // Should delete all 5 existing days
      expect(shiftWorkingDaysRepository.hardDelete).toHaveBeenCalledTimes(5);

      // Should create 7 new days
      expect(shiftWorkingDaysRepository.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ shiftId, dayOfWeek: 0 }),
            expect.objectContaining({ shiftId, dayOfWeek: 6 }),
          ]),
        }),
      );

      // Should also update the JSONB column for backward compatibility
      expect(shiftsRepository.update).toHaveBeenCalledWith(
        shiftId,
        expect.objectContaining({ workingDays: [0, 1, 2, 3, 4, 5, 6] }),
        expect.any(Object),
      );

      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw NotFoundException when shift does not exist', async () => {
      shiftsRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.replaceWorkingDays(tenantId, 'nonexistent', [1, 2, 3], auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle replacing with empty array (no working days)', async () => {
      shiftsRepository.findByIdOrNull.mockResolvedValue(mockShift);
      shiftWorkingDaysRepository.findAllRaw
        .mockResolvedValueOnce(mockWorkingDays)
        .mockResolvedValueOnce([]);
      shiftWorkingDaysRepository.hardDelete.mockResolvedValue(undefined);
      shiftsRepository.update.mockResolvedValue(undefined);

      const result = await service.replaceWorkingDays(tenantId, shiftId, [], auditContext);

      expect(shiftWorkingDaysRepository.hardDelete).toHaveBeenCalledTimes(5);
      expect(shiftWorkingDaysRepository.bulkCreate).not.toHaveBeenCalled();
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update shift and replace working days when workingDays is provided', async () => {
      shiftsRepository.findByIdOrNull.mockResolvedValue(mockShift);
      shiftsRepository.update.mockResolvedValue({ ...mockShift, nameEn: 'Updated' });
      shiftWorkingDaysRepository.findAllRaw
        .mockResolvedValueOnce(mockWorkingDays) // existing to delete
        .mockResolvedValueOnce([{ dayOfWeek: 1 }, { dayOfWeek: 2 }]); // new days
      shiftWorkingDaysRepository.hardDelete.mockResolvedValue(undefined);
      shiftWorkingDaysRepository.bulkCreate.mockResolvedValue(undefined);

      const result = await service.update(
        tenantId,
        shiftId,
        { nameEn: 'Updated', workingDays: [1, 2] } as any,
        auditContext,
      );

      expect(shiftsRepository.update).toHaveBeenCalled();
      expect(shiftWorkingDaysRepository.hardDelete).toHaveBeenCalledTimes(5);
      expect(shiftWorkingDaysRepository.bulkCreate).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should NOT touch working days when workingDays is not in DTO', async () => {
      shiftsRepository.findByIdOrNull.mockResolvedValue(mockShift);
      shiftsRepository.update.mockResolvedValue({ ...mockShift, nameEn: 'Updated' });
      shiftWorkingDaysRepository.findAllRaw.mockResolvedValue(mockWorkingDays);

      await service.update(tenantId, shiftId, { nameEn: 'Updated' } as any, auditContext);

      expect(shiftWorkingDaysRepository.hardDelete).not.toHaveBeenCalled();
      expect(shiftWorkingDaysRepository.bulkCreate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when shift not found', async () => {
      shiftsRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'nonexistent', { nameEn: 'X' } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findById ───────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return shift enriched with working days', async () => {
      shiftsRepository.findByIdOrNull.mockResolvedValue(mockShift);
      shiftWorkingDaysRepository.findAllRaw.mockResolvedValue(mockWorkingDays);

      const result = await service.findById(tenantId, shiftId);

      expect(result.workingDays).toEqual([1, 2, 3, 4, 5]);
    });

    it('should throw NotFoundException when shift not found', async () => {
      shiftsRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('should soft delete a shift', async () => {
      shiftsRepository.findByIdOrNull.mockResolvedValue(mockShift);

      await service.remove(tenantId, shiftId, auditContext);

      expect(shiftsRepository.softDelete).toHaveBeenCalledWith(shiftId, {
        tenantId,
        auditContext,
      });
    });

    it('should throw NotFoundException when shift not found', async () => {
      shiftsRepository.findByIdOrNull.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'nonexistent', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
