// Mock uuid before any imports that depend on it
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v7: jest.fn(() => 'mocked-uuid-v7'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ZatcaService } from './zatca.service';
import { ZatcaXmlService } from './zatca-xml.service';
import { ZatcaSigningService } from './zatca-signing.service';
import { ZatcaQrService } from './zatca-qr.service';
import { ZatcaPortalService } from './zatca-portal.service';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { SalesOrderLinesRepository } from '@/database/sql/repositories/sales-order-lines.repository';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import {
  ZatcaInvoiceType,
  ZatcaTransactionType,
  ZatcaStatus,
} from '@/common/enums/crm.enums';

describe('ZatcaService', () => {
  let service: ZatcaService;

  const mockSalesOrdersRepo = {
    findOneById: jest.fn(),
    updateOrder: jest.fn(),
    getNextInvoiceCounter: jest.fn(),
  };

  const mockSalesOrderLinesRepo = {
    findLinesByOrderId: jest.fn(),
  };

  const mockTenantSettingsRepo = {
    findByKeyTenant: jest.fn(),
    upsertSetting: jest.fn(),
  };

  const mockOutboxService = {
    createEvent: jest.fn(),
  };

  const mockXmlService = {
    generateXml: jest.fn(),
  };

  const mockSigningService = {
    hashInvoice: jest.fn(),
    signInvoice: jest.fn(),
    extractSignatureValue: jest.fn(),
    extractPublicKey: jest.fn(),
  };

  const mockQrService = {
    generateQr: jest.fn(),
  };

  const mockPortalService = {
    reportSimplified: jest.fn(),
    clearStandard: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZatcaService,
        { provide: SalesOrdersRepository, useValue: mockSalesOrdersRepo },
        {
          provide: SalesOrderLinesRepository,
          useValue: mockSalesOrderLinesRepo,
        },
        {
          provide: TenantSettingsRepository,
          useValue: mockTenantSettingsRepo,
        },
        { provide: OutboxSharedService, useValue: mockOutboxService },
        { provide: ZatcaXmlService, useValue: mockXmlService },
        { provide: ZatcaSigningService, useValue: mockSigningService },
        { provide: ZatcaQrService, useValue: mockQrService },
        { provide: ZatcaPortalService, useValue: mockPortalService },
      ],
    }).compile();

    service = module.get<ZatcaService>(ZatcaService);
  });

  const tenantId = 'tenant-001';
  const orderId = 'order-001';

  const makeMockOrder = (overrides: Record<string, any> = {}) => ({
    id: orderId,
    orderNumber: 'SO-00001',
    invoiceType: ZatcaInvoiceType.SIMPLIFIED,
    transactionType: ZatcaTransactionType.SALE,
    zatcaStatus: ZatcaStatus.PENDING,
    zatcaUUID: null,
    currency: 'SAR',
    subtotal: 200,
    discountAmount: 0,
    taxAmount: 30,
    totalAmount: 230,
    taxCategory: 'S',
    notes: null,
    originalInvoiceId: null,
    taxExemptionCode: null,
    taxExemptionReason: null,
    supplyType: 'goods',
    contactFirstName: null,
    contactLastName: null,
    zatcaInvoiceCounter: null,
    zatcaHash: null,
    zatcaQRCode: null,
    ...overrides,
  });

  const makeMockLines = () => [
    {
      id: 1,
      description: 'Widget',
      quantity: 2,
      unitPrice: 100,
      discountAmount: 0,
      taxRate: 15,
      taxAmount: 30,
      lineTotal: 200,
    },
  ];

  const setupZatcaSettings = () => {
    const settingsMap: Record<string, string> = {
      zatcaVatNumber: '300000000000003',
      zatcaSellerNameEn: 'Acme Corp',
      zatcaSellerNameAr: 'شركة أكمي',
      zatcaStreetEn: '123 Main St',
      zatcaStreetAr: 'شارع رئيسي',
      zatcaBuildingNumber: '1234',
      zatcaCityEn: 'Riyadh',
      zatcaCityAr: 'الرياض',
      zatcaPostalCode: '12345',
      zatcaDistrictEn: 'Olaya',
      zatcaDistrictAr: 'العليا',
      zatcaCountryCode: 'SA',
      zatcaCrNumber: '1010000000',
      zatcaPrivateKey: 'fake-private-key',
      zatcaCertificate: 'fake-certificate',
      zatcaPreviousInvoiceHash: 'prevhash==',
      zatcaEnvironment: 'sandbox',
      zatcaApiSecret: 'api-secret',
    };

    mockTenantSettingsRepo.findByKeyTenant.mockImplementation(
      (_tid: string, key: string) => {
        const value = settingsMap[key];
        return Promise.resolve(
          value !== undefined ? { key, value } : null,
        );
      },
    );
  };

  describe('issueInvoice()', () => {
    beforeEach(() => {
      setupZatcaSettings();
      mockSalesOrdersRepo.findOneById.mockResolvedValue(makeMockOrder());
      mockSalesOrderLinesRepo.findLinesByOrderId.mockResolvedValue(
        makeMockLines(),
      );
      mockSalesOrdersRepo.getNextInvoiceCounter.mockResolvedValue(42);
      mockSalesOrdersRepo.updateOrder.mockResolvedValue(undefined);
      mockTenantSettingsRepo.upsertSetting.mockResolvedValue(undefined);

      mockXmlService.generateXml.mockReturnValue('<Invoice>test xml</Invoice>');
      mockSigningService.hashInvoice.mockReturnValue('invoicehash==');
      mockSigningService.signInvoice.mockReturnValue(
        '<Invoice><ds:Signature><ds:SignatureValue>sig123==</ds:SignatureValue></ds:Signature></Invoice>',
      );
      mockSigningService.extractSignatureValue.mockReturnValue('sig123==');
      mockSigningService.extractPublicKey.mockReturnValue(
        Buffer.from('publickey'),
      );
      mockQrService.generateQr.mockResolvedValue(
        'data:image/png;base64,qrcode==',
      );
      mockPortalService.reportSimplified.mockResolvedValue({
        reportingStatus: 'REPORTED',
      });
      mockPortalService.clearStandard.mockResolvedValue({
        clearanceStatus: 'CLEARED',
      });
    });

    it('should load the order', async () => {
      await service.issueInvoice(tenantId, orderId);

      expect(mockSalesOrdersRepo.findOneById).toHaveBeenCalledWith(
        tenantId,
        orderId,
      );
    });

    it('should load ZATCA config from tenant settings', async () => {
      await service.issueInvoice(tenantId, orderId);

      expect(mockTenantSettingsRepo.findByKeyTenant).toHaveBeenCalled();
    });

    it('should generate XML', async () => {
      await service.issueInvoice(tenantId, orderId);

      expect(mockXmlService.generateXml).toHaveBeenCalledTimes(1);
      const invoiceData = mockXmlService.generateXml.mock.calls[0][0];
      expect(invoiceData.orderNumber).toBe('SO-00001');
      expect(invoiceData.invoiceTypeCodeName).toBe('0200000'); // simplified
    });

    it('should hash and sign the invoice', async () => {
      await service.issueInvoice(tenantId, orderId);

      expect(mockSigningService.hashInvoice).toHaveBeenCalledWith(
        '<Invoice>test xml</Invoice>',
      );
      expect(mockSigningService.signInvoice).toHaveBeenCalledWith(
        '<Invoice>test xml</Invoice>',
        'fake-private-key',
        'fake-certificate',
      );
    });

    it('should generate QR code for simplified invoices', async () => {
      await service.issueInvoice(tenantId, orderId);

      expect(mockQrService.generateQr).toHaveBeenCalledTimes(1);
      expect(mockQrService.generateQr).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerName: 'شركة أكمي',
          vatNumber: '300000000000003',
        }),
      );
    });

    it('should not generate QR code for standard invoices', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(
        makeMockOrder({ invoiceType: ZatcaInvoiceType.STANDARD }),
      );

      await service.issueInvoice(tenantId, orderId);

      expect(mockQrService.generateQr).not.toHaveBeenCalled();
    });

    it('should update order with hash, signature, and QR', async () => {
      await service.issueInvoice(tenantId, orderId);

      // First updateOrder call stores ZATCA data
      expect(mockSalesOrdersRepo.updateOrder).toHaveBeenCalled();
      const firstCall = mockSalesOrdersRepo.updateOrder.mock.calls[0];
      expect(firstCall[0]).toBe(tenantId);
      expect(firstCall[1]).toBe(orderId);
      expect(firstCall[3]).toEqual(
        expect.objectContaining({
          zatcaHash: 'invoicehash==',
          zatcaSignature: 'sig123==',
          zatcaQRCode: 'data:image/png;base64,qrcode==',
          zatcaInvoiceCounter: 42,
        }),
      );
    });

    it('should call reportSimplified for simplified invoices', async () => {
      await service.issueInvoice(tenantId, orderId);

      expect(mockPortalService.reportSimplified).toHaveBeenCalledTimes(1);
      expect(mockPortalService.clearStandard).not.toHaveBeenCalled();
    });

    it('should call clearStandard for standard invoices', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(
        makeMockOrder({ invoiceType: ZatcaInvoiceType.STANDARD }),
      );

      await service.issueInvoice(tenantId, orderId);

      expect(mockPortalService.clearStandard).toHaveBeenCalledTimes(1);
      expect(mockPortalService.reportSimplified).not.toHaveBeenCalled();
    });

    it('should not throw when portal submission fails (best-effort)', async () => {
      mockPortalService.reportSimplified.mockRejectedValue(
        new Error('Portal down'),
      );

      await expect(
        service.issueInvoice(tenantId, orderId),
      ).resolves.toBeUndefined();

      // Should update status to REJECTED
      const lastUpdateCall =
        mockSalesOrdersRepo.updateOrder.mock.calls[
          mockSalesOrdersRepo.updateOrder.mock.calls.length - 1
        ];
      expect(lastUpdateCall[3]).toEqual(
        expect.objectContaining({
          zatcaStatus: ZatcaStatus.REJECTED,
        }),
      );
    });

    it('should skip already submitted orders', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(
        makeMockOrder({ zatcaStatus: ZatcaStatus.SUBMITTED }),
      );

      await service.issueInvoice(tenantId, orderId);

      expect(mockXmlService.generateXml).not.toHaveBeenCalled();
    });

    it('should skip already cleared orders', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(
        makeMockOrder({ zatcaStatus: ZatcaStatus.CLEARED }),
      );

      await service.issueInvoice(tenantId, orderId);

      expect(mockXmlService.generateXml).not.toHaveBeenCalled();
    });

    it('should return early when order is not found', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(null);

      await service.issueInvoice(tenantId, orderId);

      expect(mockXmlService.generateXml).not.toHaveBeenCalled();
    });

    it('should use 0100000 InvoiceTypeCodeName for standard invoices', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(
        makeMockOrder({ invoiceType: ZatcaInvoiceType.STANDARD }),
      );

      await service.issueInvoice(tenantId, orderId);

      const invoiceData = mockXmlService.generateXml.mock.calls[0][0];
      expect(invoiceData.invoiceTypeCodeName).toBe('0100000');
    });

    it('should use 381 invoiceTypeCode for credit notes', async () => {
      mockSalesOrdersRepo.findOneById.mockResolvedValue(
        makeMockOrder({
          transactionType: ZatcaTransactionType.CREDIT_NOTE,
          originalInvoiceId: 'INV-001',
        }),
      );

      await service.issueInvoice(tenantId, orderId);

      const invoiceData = mockXmlService.generateXml.mock.calls[0][0];
      expect(invoiceData.invoiceTypeCode).toBe('381');
      expect(invoiceData.transactionTypeCode).toBe('381');
    });
  });

  describe('loadZatcaConfig()', () => {
    it('should throw ZATCA_NOT_CONFIGURED when required settings are missing', async () => {
      mockTenantSettingsRepo.findByKeyTenant.mockResolvedValue(null);

      await expect(service.loadZatcaConfig(tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return config when all required settings exist', async () => {
      setupZatcaSettings();

      const config = await service.loadZatcaConfig(tenantId);

      expect(config.vatNumber).toBe('300000000000003');
      expect(config.sellerNameEn).toBe('Acme Corp');
      expect(config.sellerNameAr).toBe('شركة أكمي');
      expect(config.privateKey).toBe('fake-private-key');
      expect(config.certificate).toBe('fake-certificate');
      expect(config.environment).toBe('sandbox');
    });

    it('should use default values for optional settings', async () => {
      // Only provide required settings
      const requiredSettings: Record<string, string> = {
        zatcaVatNumber: '300000000000003',
        zatcaSellerNameEn: 'Acme Corp',
        zatcaSellerNameAr: 'شركة أكمي',
        zatcaPrivateKey: 'fake-key',
        zatcaCertificate: 'fake-cert',
      };

      mockTenantSettingsRepo.findByKeyTenant.mockImplementation(
        (_tid: string, key: string) => {
          const value = requiredSettings[key];
          return Promise.resolve(
            value !== undefined ? { key, value } : null,
          );
        },
      );

      const config = await service.loadZatcaConfig(tenantId);

      expect(config.countryCode).toBe('SA');
      expect(config.environment).toBe('sandbox');
      expect(config.streetEn).toBe('');
    });
  });
});
