// Mock uuid before any imports that depend on it (BaseEntity uses uuid)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

jest.mock('@/database/sql/repositories/leads.repository', () => ({
  LeadsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/lead-activities.repository', () => ({
  LeadActivitiesRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/crm-stages.repository', () => ({
  CrmStagesRepository: jest.fn(),
}));

// Mock CLS for msg() helper
jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(() => ({ get: () => 'en' })),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsRepository } from '@/database/sql/repositories/leads.repository';
import { LeadActivitiesRepository } from '@/database/sql/repositories/lead-activities.repository';
import { CrmStagesRepository } from '@/database/sql/repositories/crm-stages.repository';
import { CurrencyService } from '@/modules/currency/currency.service';
import { SalesOrderSharedService } from '@/shared/services/sales-order-shared.service';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { ActivitiesService } from '@/modules/activities/services/activities.service';
import { LeadType, LeadActivityType } from '@/common/enums/crm.enums';
import { ActivityType } from '@/common/enums/activity.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';

describe('LeadsService', () => {
  let service: LeadsService;

  const mockLeadsRepo = {
    findAllPaginated: jest.fn(),
    findOneById: jest.fn(),
    findDropdown: jest.fn(),
    insertLead: jest.fn(),
    updateLead: jest.fn(),
    changeStage: jest.fn(),
    convertToOpportunity: jest.fn(),
    winLead: jest.fn(),
    loseLead: jest.fn(),
    softDeleteLead: jest.fn(),
    getPipelineByStage: jest.fn(),
    getConversionReport: jest.fn(),
    setSaleOrderId: jest.fn(),
  };

  const mockLeadActivitiesRepo = {
    findByLeadId: jest.fn(),
    insertActivity: jest.fn(),
  };

  const mockCrmStagesRepo = {
    findByIdOrNull: jest.fn(),
    findAll: jest.fn(),
  };

  const mockCurrencyService = {
    getBaseCurrency: jest.fn(),
  };

  const mockSalesOrderSharedService = {
    createFromLead: jest.fn(),
  };

  const mockOutboxSharedService = {
    createEvent: jest.fn(),
  };

  const mockActivitiesService = {
    create: jest.fn(),
  };

  const tenantId = 'tenant-001';
  const auditContext = { userId: 'user-001', tenantId: 'tenant-001' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: LeadsRepository, useValue: mockLeadsRepo },
        { provide: LeadActivitiesRepository, useValue: mockLeadActivitiesRepo },
        { provide: CrmStagesRepository, useValue: mockCrmStagesRepo },
        { provide: CurrencyService, useValue: mockCurrencyService },
        { provide: SalesOrderSharedService, useValue: mockSalesOrderSharedService },
        { provide: OutboxSharedService, useValue: mockOutboxSharedService },
        { provide: ActivitiesService, useValue: mockActivitiesService },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated results with defaults', async () => {
      mockLeadsRepo.findAllPaginated.mockResolvedValue({
        rows: [{ id: 'lead-1', title: 'Test Lead' }],
        total: 1,
      });

      const result = await service.findAll(tenantId, {} as PaginationDto);

      expect(mockLeadsRepo.findAllPaginated).toHaveBeenCalledWith(tenantId, {
        limit: 20,
        offset: 0,
        search: undefined,
        sortOrder: 'DESC',
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should calculate correct offset for page 3', async () => {
      mockLeadsRepo.findAllPaginated.mockResolvedValue({ rows: [], total: 50 });

      const result = await service.findAll(tenantId, { page: 3, limit: 10 } as PaginationDto);

      expect(mockLeadsRepo.findAllPaginated).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ limit: 10, offset: 20 }),
      );
      expect(result.meta).toEqual({ page: 3, limit: 10, total: 50, totalPages: 5 });
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return lead with activities when found', async () => {
      const lead = { id: 'lead-1', title: 'Test Lead' } as any;
      mockLeadsRepo.findOneById.mockResolvedValue(lead);
      mockLeadActivitiesRepo.findByLeadId.mockResolvedValue([{ id: 'act-1' }]);

      const result = await service.findById(tenantId, 'lead-1');

      expect(result.activities).toEqual([{ id: 'act-1' }]);
    });

    it('should throw NotFoundException when lead does not exist', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      titleEn: 'New Lead',
      partnerId: 'partner-1',
      priority: 'medium' as any,
    };

    beforeEach(() => {
      mockLeadsRepo.insertLead.mockResolvedValue('new-lead-id');
      mockLeadsRepo.findOneById.mockResolvedValue({
        id: 'new-lead-id',
        title: 'New Lead',
      });
      mockLeadActivitiesRepo.findByLeadId.mockResolvedValue([]);
      mockCurrencyService.getBaseCurrency.mockResolvedValue({ id: 'cur-1', code: 'SAR' });
    });

    it('should auto-assign first CRM stage when no stageId provided', async () => {
      const firstStage = { id: 'stage-1', probability: 10, sequence: 1 };
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [firstStage] });

      await service.create(tenantId, baseDto as any, auditContext);

      expect(mockCrmStagesRepo.findAll).toHaveBeenCalledWith({
        tenantId,
        page: 1,
        limit: 1,
        sortBy: 'sequence',
        sortOrder: 'ASC',
      });
      expect(mockLeadsRepo.insertLead).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          stageId: 'stage-1',
          probability: 10,
        }),
      );
    });

    it('should set probability from stage when probability not provided', async () => {
      const stage = { id: 'stage-2', probability: 50 };
      mockCrmStagesRepo.findByIdOrNull.mockResolvedValue(stage);

      await service.create(tenantId, { ...baseDto, stageId: 'stage-2' } as any, auditContext);

      expect(mockLeadsRepo.insertLead).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ probability: 50 }),
      );
    });

    it('should throw BadRequestException when provided stageId does not exist', async () => {
      mockCrmStagesRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.create(tenantId, { ...baseDto, stageId: 'bad-stage' } as any, auditContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use partnerId (not contactId)', async () => {
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [] });

      await service.create(tenantId, baseDto as any, auditContext);

      expect(mockLeadsRepo.insertLead).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ partnerId: 'partner-1' }),
      );
    });

    it('should default type to LeadType.LEAD', async () => {
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [] });

      await service.create(tenantId, baseDto as any, auditContext);

      expect(mockLeadsRepo.insertLead).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ type: LeadType.LEAD }),
      );
    });

    it('should convert expectedRevenue to base currency', async () => {
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [] });
      mockCurrencyService.getBaseCurrency.mockResolvedValue({ id: 'cur-1', code: 'SAR' });

      await service.create(tenantId, { ...baseDto, expectedRevenue: 5000 } as any, auditContext);

      expect(mockLeadsRepo.insertLead).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          expectedRevenue: 5000,
          expectedRevenueBase: 5000,
        }),
      );
    });

    it('should set optional fields to null when not provided', async () => {
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [] });

      await service.create(tenantId, { titleEn: 'Minimal' } as any, auditContext);

      expect(mockLeadsRepo.insertLead).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          partnerId: null,
          assignedTo: null,
          expectedCloseDate: null,
          source: null,
          campaign: null,
          medium: null,
          tags: null,
          notes: null,
        }),
      );
    });
  });

  // ── changeStage ──────────────────────────────────────────────────────────────

  describe('changeStage', () => {
    const existingLead = {
      id: 'lead-1',
      title: 'Test',
      stageId: 'stage-1',
      stageNameEn: 'New',
      isWon: false,
      isLost: false,
      assignedTo: 'user-001',
    };

    beforeEach(() => {
      mockLeadsRepo.findOneById.mockResolvedValue(existingLead);
      mockLeadActivitiesRepo.findByLeadId.mockResolvedValue([]);
    });

    it('should validate that target stage exists', async () => {
      mockCrmStagesRepo.findByIdOrNull.mockResolvedValue(null);

      await expect(
        service.changeStage(tenantId, 'lead-1', { stageId: 'bad-stage' }, auditContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update probability from stage', async () => {
      const targetStage = { id: 'stage-2', probability: 75, nameEn: 'Qualified' };
      mockCrmStagesRepo.findByIdOrNull.mockResolvedValue(targetStage);

      await service.changeStage(tenantId, 'lead-1', { stageId: 'stage-2' }, auditContext);

      expect(mockLeadsRepo.changeStage).toHaveBeenCalledWith(tenantId, 'lead-1', {
        stageId: 'stage-2',
        probability: 75,
        updatedBy: 'user-001',
      });
    });

    it('should log CRM activity with STAGE_CHANGE type', async () => {
      const targetStage = { id: 'stage-2', probability: 75, nameEn: 'Qualified' };
      mockCrmStagesRepo.findByIdOrNull.mockResolvedValue(targetStage);

      await service.changeStage(tenantId, 'lead-1', { stageId: 'stage-2' }, auditContext);

      expect(mockLeadActivitiesRepo.insertActivity).toHaveBeenCalledWith(tenantId, {
        leadId: 'lead-1',
        userId: 'user-001',
        activityType: LeadActivityType.STAGE_CHANGE,
        fromStageId: 'stage-1',
        toStageId: 'stage-2',
        notes: null,
        createdBy: 'user-001',
      });
    });

    it('should create universal activity via ActivitiesService', async () => {
      const targetStage = { id: 'stage-2', probability: 75, nameEn: 'Qualified' };
      mockCrmStagesRepo.findByIdOrNull.mockResolvedValue(targetStage);

      await service.changeStage(tenantId, 'lead-1', { stageId: 'stage-2' }, auditContext);

      expect(mockActivitiesService.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          model: 'leads',
          recordId: 'lead-1',
          activityType: ActivityType.TODO,
          assignedTo: 'user-001',
        }),
        auditContext,
      );
    });

    it('should throw BadRequestException when lead is already won', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue({ ...existingLead, isWon: true });

      await expect(
        service.changeStage(tenantId, 'lead-1', { stageId: 'stage-2' }, auditContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when lead is already lost', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue({ ...existingLead, isLost: true });

      await expect(
        service.changeStage(tenantId, 'lead-1', { stageId: 'stage-2' }, auditContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when lead does not exist', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue(null);

      await expect(
        service.changeStage(tenantId, 'missing', { stageId: 'stage-2' }, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── convert ──────────────────────────────────────────────────────────────────

  describe('convert', () => {
    const leadRecord = {
      id: 'lead-1',
      title: 'Test',
      type: LeadType.LEAD,
      isWon: false,
      isLost: false,
    };

    beforeEach(() => {
      mockLeadsRepo.findOneById.mockResolvedValue(leadRecord);
      mockLeadActivitiesRepo.findByLeadId.mockResolvedValue([]);
    });

    it('should convert lead type from lead to opportunity', async () => {
      await service.convert(tenantId, 'lead-1', auditContext);

      expect(mockLeadsRepo.convertToOpportunity).toHaveBeenCalledWith(
        tenantId,
        'lead-1',
        'user-001',
      );
    });

    it('should log CONVERTED activity', async () => {
      await service.convert(tenantId, 'lead-1', auditContext);

      expect(mockLeadActivitiesRepo.insertActivity).toHaveBeenCalledWith(tenantId, {
        leadId: 'lead-1',
        userId: 'user-001',
        activityType: LeadActivityType.CONVERTED,
        notes: 'Converted from lead to opportunity',
        createdBy: 'user-001',
      });
    });

    it('should throw BadRequestException when lead is already an opportunity', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue({
        ...leadRecord,
        type: LeadType.OPPORTUNITY,
      });

      await expect(service.convert(tenantId, 'lead-1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when lead is already closed (won)', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue({ ...leadRecord, isWon: true });

      await expect(service.convert(tenantId, 'lead-1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when lead does not exist', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue(null);

      await expect(service.convert(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── win ──────────────────────────────────────────────────────────────────────

  describe('win', () => {
    const leadRecord = {
      id: 'lead-1',
      title: 'Big Deal',
      stageId: 'stage-2',
      partnerId: 'partner-1',
      currencyId: null,
      isWon: false,
      isLost: false,
      assignedTo: 'user-001',
    };

    beforeEach(() => {
      mockLeadsRepo.findOneById.mockResolvedValue(leadRecord);
      mockLeadActivitiesRepo.findByLeadId.mockResolvedValue([]);
      mockCurrencyService.getBaseCurrency.mockResolvedValue({ id: 'cur-sar', code: 'SAR' });
      mockSalesOrderSharedService.createFromLead.mockResolvedValue({ id: 'so-1' });
    });

    it('should set isWon=true via winLead', async () => {
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [{ id: 'won-stage' }] });

      await service.win(tenantId, 'lead-1', auditContext);

      expect(mockLeadsRepo.winLead).toHaveBeenCalledWith(
        tenantId,
        'lead-1',
        'won-stage',
        'user-001',
      );
    });

    it('should move to winning stage (isWon=true on crm_stages)', async () => {
      const wonStage = { id: 'won-stage', isWon: true };
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [wonStage] });

      await service.win(tenantId, 'lead-1', auditContext);

      expect(mockCrmStagesRepo.findAll).toHaveBeenCalledWith({
        tenantId,
        page: 1,
        limit: 1,
        where: { isWon: true },
        sortBy: 'sequence',
        sortOrder: 'ASC',
      });
      expect(mockLeadsRepo.winLead).toHaveBeenCalledWith(
        tenantId,
        'lead-1',
        'won-stage',
        'user-001',
      );
    });

    it('should fall back to current stageId when no won stage exists', async () => {
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [] });

      await service.win(tenantId, 'lead-1', auditContext);

      expect(mockLeadsRepo.winLead).toHaveBeenCalledWith(
        tenantId,
        'lead-1',
        'stage-2', // existing lead stageId
        'user-001',
      );
    });

    it('should create sales order via SalesOrderSharedService using partnerId', async () => {
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [{ id: 'won-stage' }] });

      await service.win(tenantId, 'lead-1', auditContext);

      expect(mockSalesOrderSharedService.createFromLead).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          partnerId: 'partner-1',
          currencyId: 'cur-sar',
        }),
        auditContext,
      );
    });

    it('should store saleOrderId on lead after sales order creation', async () => {
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [{ id: 'won-stage' }] });

      await service.win(tenantId, 'lead-1', auditContext);

      expect(mockLeadsRepo.setSaleOrderId).toHaveBeenCalledWith(tenantId, 'lead-1', 'so-1');
    });

    it('should log WON activity', async () => {
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [{ id: 'won-stage' }] });

      await service.win(tenantId, 'lead-1', auditContext);

      expect(mockLeadActivitiesRepo.insertActivity).toHaveBeenCalledWith(tenantId, {
        leadId: 'lead-1',
        userId: 'user-001',
        activityType: LeadActivityType.WON,
        fromStageId: 'stage-2',
        toStageId: 'won-stage',
        notes: null,
        createdBy: 'user-001',
      });
    });

    it('should throw BadRequestException when lead is already won', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue({ ...leadRecord, isWon: true });

      await expect(service.win(tenantId, 'lead-1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when lead is already lost', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue({ ...leadRecord, isLost: true });

      await expect(service.win(tenantId, 'lead-1', auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not throw if sales order creation fails (logs error)', async () => {
      mockCrmStagesRepo.findAll.mockResolvedValue({ data: [{ id: 'won-stage' }] });
      mockSalesOrderSharedService.createFromLead.mockRejectedValue(new Error('SO failed'));

      await expect(service.win(tenantId, 'lead-1', auditContext)).resolves.toBeDefined();
      expect(mockLeadsRepo.setSaleOrderId).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when lead does not exist', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue(null);

      await expect(service.win(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── lose ─────────────────────────────────────────────────────────────────────

  describe('lose', () => {
    const leadRecord = {
      id: 'lead-1',
      title: 'Lost Deal',
      stageId: 'stage-2',
      partnerId: 'partner-1',
      assignedTo: 'user-001',
      isWon: false,
      isLost: false,
    };

    const loseDto = { reason: 'Too expensive' };

    beforeEach(() => {
      mockLeadsRepo.findOneById.mockResolvedValue(leadRecord);
      mockLeadActivitiesRepo.findByLeadId.mockResolvedValue([]);
    });

    it('should mark lead as lost with reason', async () => {
      await service.lose(tenantId, 'lead-1', loseDto, auditContext);

      expect(mockLeadsRepo.loseLead).toHaveBeenCalledWith(
        tenantId,
        'lead-1',
        'Too expensive',
        'user-001',
      );
    });

    it('should log LOST activity with reason as notes', async () => {
      await service.lose(tenantId, 'lead-1', loseDto, auditContext);

      expect(mockLeadActivitiesRepo.insertActivity).toHaveBeenCalledWith(tenantId, {
        leadId: 'lead-1',
        userId: 'user-001',
        activityType: LeadActivityType.LOST,
        fromStageId: 'stage-2',
        notes: 'Too expensive',
        createdBy: 'user-001',
      });
    });

    it('should emit outbox event for lead lost', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      const mockSequelize = { transaction: jest.fn().mockResolvedValue(mockTransaction) };
      (mockLeadsRepo as any).getSequelizeInstance = jest.fn().mockResolvedValue(mockSequelize);

      await service.lose(tenantId, 'lead-1', loseDto, auditContext);

      expect(mockOutboxSharedService.createEvent).toHaveBeenCalledWith(
        mockTransaction,
        tenantId,
        'LEAD_LOST',
        expect.objectContaining({
          leadId: 'lead-1',
          lostReason: 'Too expensive',
          partnerId: 'partner-1',
        }),
        'lead-1',
        'lead',
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw BadRequestException when lead is already won', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue({ ...leadRecord, isWon: true });

      await expect(service.lose(tenantId, 'lead-1', loseDto, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when lead is already lost', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue({ ...leadRecord, isLost: true });

      await expect(service.lose(tenantId, 'lead-1', loseDto, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when lead does not exist', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue(null);

      await expect(service.lose(tenantId, 'missing', loseDto, auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getPipeline ──────────────────────────────────────────────────────────────

  describe('getPipeline', () => {
    it('should return leads grouped by stage for kanban view', async () => {
      mockLeadsRepo.getPipelineByStage.mockResolvedValue({
        stages: [
          {
            stageId: 'stage-1',
            nameEn: 'New',
            nameAr: 'جديد',
            sequence: 1,
            stageProbability: '10',
            isWon: false,
            isFolded: false,
            count: '2',
            totalValue: '5000',
          },
          {
            stageId: 'stage-2',
            nameEn: 'Won',
            nameAr: 'فاز',
            sequence: 2,
            stageProbability: '100',
            isWon: true,
            isFolded: false,
            count: '0',
            totalValue: '0',
          },
        ],
        leads: [
          { id: 'lead-1', stageId: 'stage-1' },
          { id: 'lead-2', stageId: 'stage-1' },
        ],
      });

      const result = await service.getPipeline(tenantId);

      expect(result).toHaveLength(2);
      expect(result[0].stageId).toBe('stage-1');
      expect(result[0].leads).toHaveLength(2);
      expect(result[0].stageProbability).toBe(10);
      expect(result[0].count).toBe(2);
      expect(result[0].totalValue).toBe(5000);
      expect(result[1].leads).toHaveLength(0);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft delete the lead', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue({ id: 'lead-1' });

      await service.remove(tenantId, 'lead-1', auditContext);

      expect(mockLeadsRepo.softDeleteLead).toHaveBeenCalledWith(tenantId, 'lead-1', 'user-001');
    });

    it('should throw NotFoundException when lead does not exist', async () => {
      mockLeadsRepo.findOneById.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'missing', auditContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getDropdown ──────────────────────────────────────────────────────────────

  describe('getDropdown', () => {
    it('should call repository with correct params', async () => {
      mockLeadsRepo.findDropdown.mockResolvedValue([]);

      await service.getDropdown(tenantId, { search: 'test', limit: 25 });

      expect(mockLeadsRepo.findDropdown).toHaveBeenCalledWith(tenantId, {
        search: 'test',
        limit: 25,
      });
    });

    it('should default limit to 50', async () => {
      mockLeadsRepo.findDropdown.mockResolvedValue([]);

      await service.getDropdown(tenantId, {});

      expect(mockLeadsRepo.findDropdown).toHaveBeenCalledWith(tenantId, {
        search: undefined,
        limit: 50,
      });
    });
  });
});
