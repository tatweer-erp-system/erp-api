import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { SalesOrderLinesRepository } from '@/database/sql/repositories/sales-order-lines.repository';
import { TenantSettingsRepository } from '@/database/sql/repositories/tenant-settings.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { ZatcaXmlService } from './zatca-xml.service';
import { ZatcaSigningService } from './zatca-signing.service';
import { ZatcaQrService } from './zatca-qr.service';
import { ZatcaPortalService } from './zatca-portal.service';
import {
  ZatcaConfig,
  ZatcaInvoiceData,
  ZatcaLineData,
} from '../interfaces/zatca.interfaces';
import {
  ZatcaInvoiceType,
  ZatcaTransactionType,
  ZatcaStatus,
  ZatcaTaxCategory,
} from '@/common/enums/crm.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

const ZATCA_SETTINGS_KEYS = [
  'zatcaVatNumber',
  'zatcaSellerNameEn',
  'zatcaSellerNameAr',
  'zatcaStreetEn',
  'zatcaStreetAr',
  'zatcaBuildingNumber',
  'zatcaCityEn',
  'zatcaCityAr',
  'zatcaPostalCode',
  'zatcaDistrictEn',
  'zatcaDistrictAr',
  'zatcaCountryCode',
  'zatcaCrNumber',
  'zatcaPrivateKey',
  'zatcaCertificate',
  'zatcaPreviousInvoiceHash',
  'zatcaEnvironment',
  'zatcaApiSecret',
] as const;

// Base64 of SHA-256 of empty string — used as first PIH
const GENESIS_HASH =
  'NWZlYjJmZjAyOGE0N2VhMmEyOGEwNTQxMTY4NWRlYTc=' +
  'MGJiNjhjNWNlNjE1MGM0MDk3NjJjN2VhMmMzMDIyMzE=';

@Injectable()
export class ZatcaService {
  private readonly logger = new Logger(ZatcaService.name);

  constructor(
    private readonly salesOrdersRepository: SalesOrdersRepository,
    private readonly salesOrderLinesRepository: SalesOrderLinesRepository,
    private readonly tenantSettingsRepository: TenantSettingsRepository,
    private readonly outboxService: OutboxSharedService,
    private readonly xmlService: ZatcaXmlService,
    private readonly signingService: ZatcaSigningService,
    private readonly qrService: ZatcaQrService,
    private readonly portalService: ZatcaPortalService,
  ) {}

  /**
   * Issues a ZATCA invoice for a sales order.
   * This is a post-commit, best-effort operation.
   */
  async issueInvoice(tenantId: string, orderId: string): Promise<void> {
    // 1. Load order
    const order = await this.salesOrdersRepository.findOneById(tenantId, orderId);
    if (!order) {
      this.logger.warn(`Order ${orderId} not found for ZATCA issuance`);
      return;
    }

    // Skip if already submitted
    if (
      order.zatcaStatus === ZatcaStatus.SUBMITTED ||
      order.zatcaStatus === ZatcaStatus.CLEARED
    ) {
      this.logger.warn(
        `Order ${orderId} already has zatcaStatus=${order.zatcaStatus}, skipping`,
      );
      return;
    }

    // 2. Load ZATCA config
    const config = await this.loadZatcaConfig(tenantId);

    // 3. Load order lines
    const lines = await this.salesOrderLinesRepository.findLinesByOrderId(
      tenantId,
      orderId,
    );

    // 4. Assign UUID if not set
    const zatcaUUID = order.zatcaUUID || uuidv4();

    // 5. Increment invoice counter
    const invoiceCounter = await this.incrementCounter(tenantId, config);

    // 6. Determine invoice type metadata
    const invoiceType = order.invoiceType || ZatcaInvoiceType.STANDARD;
    const isSimplified = invoiceType === ZatcaInvoiceType.SIMPLIFIED;
    const transactionType =
      order.transactionType || ZatcaTransactionType.SALE;
    const isCreditNote = transactionType === ZatcaTransactionType.CREDIT_NOTE;

    // Build invoice data
    const now = new Date();
    const saudiTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const issueDate = saudiTime.toISOString().split('T')[0];
    const issueTime = saudiTime.toISOString().split('T')[1].split('.')[0];

    const taxRate = this.determineTaxRate(order.taxCategory);

    const invoiceData: ZatcaInvoiceData = {
      id: order.id,
      orderNumber: order.orderNumber,
      uuid: zatcaUUID,
      issueDate,
      issueTime,
      invoiceTypeCode: isCreditNote ? '381' : '388',
      invoiceTypeCodeName: isSimplified ? '0200000' : '0100000',
      transactionTypeCode: isCreditNote ? '381' : '388',
      currency: order.currency || 'SAR',
      invoiceCounter,
      previousInvoiceHash: config.previousInvoiceHash || GENESIS_HASH,
      notes: order.notes,
      originalInvoiceId: order.originalInvoiceId || null,
      seller: {
        nameEn: config.sellerNameEn,
        nameAr: config.sellerNameAr,
        vatNumber: config.vatNumber,
        street: config.streetEn,
        buildingNumber: config.buildingNumber,
        city: config.cityEn,
        postalCode: config.postalCode,
        district: config.districtEn,
        countryCode: config.countryCode || 'SA',
        crNumber: config.crNumber,
      },
      buyer: isSimplified
        ? null
        : {
            nameEn: order.contactFirstName
              ? `${order.contactFirstName} ${order.contactLastName || ''}`
              : 'Walk-in Customer',
            nameAr: order.contactFirstName
              ? `${order.contactFirstName} ${order.contactLastName || ''}`
              : 'عميل',
            vatNumber: '',
            street: '',
            buildingNumber: '',
            city: '',
            postalCode: '',
            district: '',
            countryCode: 'SA',
          },
      lines: this.mapLines(lines, order.taxCategory),
      subtotal: Number(order.subtotal) || 0,
      discountAmount: Number(order.discountAmount) || 0,
      taxAmount: Number(order.taxAmount) || 0,
      totalAmount: Number(order.totalAmount) || 0,
      taxCategory: order.taxCategory || ZatcaTaxCategory.S,
      taxRate,
      taxExemptionCode: order.taxExemptionCode || null,
      taxExemptionReason: order.taxExemptionReason || null,
      supplyType: order.supplyType || 'goods',
    };

    // 6. Generate UBL XML
    const xml = this.xmlService.generateXml(invoiceData);

    // 7. Hash the invoice
    const invoiceHash = this.signingService.hashInvoice(xml);

    // 8. Sign the invoice
    const signedXml = this.signingService.signInvoice(
      xml,
      config.privateKey,
      config.certificate,
    );

    // 9. Extract signature value
    const signatureValue = this.signingService.extractSignatureValue(signedXml);

    // 10. Generate QR code (simplified only)
    let qrCode: string | null = null;
    if (isSimplified) {
      const publicKeyBuf = this.signingService.extractPublicKey(config.certificate);
      qrCode = await this.qrService.generateQr({
        sellerName: config.sellerNameAr,
        vatNumber: config.vatNumber,
        timestamp: saudiTime.toISOString(),
        totalWithVat: invoiceData.totalAmount.toFixed(2),
        vatAmount: invoiceData.taxAmount.toFixed(2),
        xmlHash: invoiceHash,
        signature: signatureValue,
        publicKey: publicKeyBuf.toString('base64'),
      });
    }

    // 11. Update order with ZATCA data
    const signedXmlBase64 = Buffer.from(signedXml, 'utf8').toString('base64');
    await this.salesOrdersRepository.updateOrder(
      tenantId,
      orderId,
      [
        '"zatcaUUID" = :zatcaUUID',
        '"zatcaInvoiceCounter" = :zatcaInvoiceCounter',
        '"zatcaHash" = :zatcaHash',
        '"zatcaSignature" = :zatcaSignature',
        '"zatcaQRCode" = :zatcaQRCode',
        '"zatcaSubmittedAt" = NOW()',
        'version = version + 1',
      ],
      {
        id: orderId,
        zatcaUUID,
        zatcaInvoiceCounter: invoiceCounter,
        zatcaHash: invoiceHash,
        zatcaSignature: signatureValue,
        zatcaQRCode: qrCode,
      },
    );

    // 12. Update previous invoice hash setting for chaining
    await this.tenantSettingsRepository.upsertSetting(tenantId, {
      key: 'zatcaPreviousInvoiceHash',
      value: invoiceHash,
      group: 'zatca',
    });

    // 13. Submit to ZATCA portal (best-effort)
    try {
      const certBase64 = config.certificate;

      if (isSimplified) {
        const response = await this.portalService.reportSimplified(
          signedXmlBase64,
          invoiceHash,
          zatcaUUID,
          config.environment,
          config.apiSecret,
          certBase64,
        );

        const status =
          response.reportingStatus === 'REPORTED'
            ? ZatcaStatus.SUBMITTED
            : ZatcaStatus.REJECTED;

        await this.salesOrdersRepository.updateOrder(
          tenantId,
          orderId,
          ['"zatcaStatus" = :zatcaStatus', 'version = version + 1'],
          { id: orderId, zatcaStatus: status },
        );
      } else {
        const response = await this.portalService.clearStandard(
          signedXmlBase64,
          invoiceHash,
          zatcaUUID,
          config.environment,
          config.apiSecret,
          certBase64,
        );

        const status =
          response.clearanceStatus === 'CLEARED'
            ? ZatcaStatus.CLEARED
            : ZatcaStatus.REJECTED;

        await this.salesOrdersRepository.updateOrder(
          tenantId,
          orderId,
          [
            '"zatcaStatus" = :zatcaStatus',
            '"zatcaClearedAt" = :zatcaClearedAt',
            'version = version + 1',
          ],
          {
            id: orderId,
            zatcaStatus: status,
            zatcaClearedAt:
              status === ZatcaStatus.CLEARED ? new Date() : null,
          },
        );
      }
    } catch (portalError) {
      const errMsg =
        portalError instanceof Error ? portalError.message : String(portalError);
      this.logger.error(
        `ZATCA portal submission failed for order ${orderId}: ${errMsg}`,
      );

      // Update status to rejected but don't fail the operation
      await this.salesOrdersRepository.updateOrder(
        tenantId,
        orderId,
        ['"zatcaStatus" = :zatcaStatus', 'version = version + 1'],
        { id: orderId, zatcaStatus: ZatcaStatus.REJECTED },
      );
    }
  }

  /**
   * Issues a credit note for an original order.
   */
  async issueCreditNote(
    tenantId: string,
    originalOrderId: string,
    refundAmount: number,
  ): Promise<void> {
    const order = await this.salesOrdersRepository.findOneById(
      tenantId,
      originalOrderId,
    );
    if (!order) {
      this.logger.warn(
        `Original order ${originalOrderId} not found for credit note`,
      );
      return;
    }

    // Create a credit note record by updating the original order's
    // transactionType, then issue it
    await this.salesOrdersRepository.updateOrder(
      tenantId,
      originalOrderId,
      [
        '"transactionType" = :transactionType',
        '"zatcaStatus" = :zatcaStatus',
        'version = version + 1',
      ],
      {
        id: originalOrderId,
        transactionType: ZatcaTransactionType.CREDIT_NOTE,
        zatcaStatus: ZatcaStatus.PENDING,
      },
    );

    await this.issueInvoice(tenantId, originalOrderId);
  }

  /**
   * Loads all ZATCA settings for a tenant.
   */
  async loadZatcaConfig(tenantId: string): Promise<ZatcaConfig> {
    const settings: Record<string, string> = {};

    for (const key of ZATCA_SETTINGS_KEYS) {
      const setting = await this.tenantSettingsRepository.findByKeyTenant(
        tenantId,
        key,
      );
      settings[key] = setting?.value ?? '';
    }

    // Validate required settings
    const requiredKeys: Array<(typeof ZATCA_SETTINGS_KEYS)[number]> = [
      'zatcaVatNumber',
      'zatcaSellerNameEn',
      'zatcaSellerNameAr',
      'zatcaPrivateKey',
      'zatcaCertificate',
    ];

    for (const key of requiredKeys) {
      if (!settings[key]) {
        throw new BadRequestException(
          msg(ErrorMessages.ZATCA_NOT_CONFIGURED, key),
        );
      }
    }

    return {
      vatNumber: settings.zatcaVatNumber,
      sellerNameEn: settings.zatcaSellerNameEn,
      sellerNameAr: settings.zatcaSellerNameAr,
      streetEn: settings.zatcaStreetEn || '',
      streetAr: settings.zatcaStreetAr || '',
      buildingNumber: settings.zatcaBuildingNumber || '',
      cityEn: settings.zatcaCityEn || '',
      cityAr: settings.zatcaCityAr || '',
      postalCode: settings.zatcaPostalCode || '',
      districtEn: settings.zatcaDistrictEn || '',
      districtAr: settings.zatcaDistrictAr || '',
      countryCode: settings.zatcaCountryCode || 'SA',
      crNumber: settings.zatcaCrNumber || '',
      privateKey: settings.zatcaPrivateKey,
      certificate: settings.zatcaCertificate,
      previousInvoiceHash: settings.zatcaPreviousInvoiceHash || GENESIS_HASH,
      environment:
        (settings.zatcaEnvironment as 'sandbox' | 'production') || 'sandbox',
      apiSecret: settings.zatcaApiSecret || '',
    };
  }

  /**
   * Gets the signed XML for an order.
   */
  async getSignedXml(tenantId: string, orderId: string): Promise<string> {
    const order = await this.salesOrdersRepository.findOneById(tenantId, orderId);
    if (!order) {
      throw new BadRequestException(
        msg(ErrorMessages.SALES_ORDER_NOT_FOUND, orderId),
      );
    }

    if (!order.zatcaHash) {
      throw new BadRequestException(
        msg(ErrorMessages.ZATCA_NOT_CONFIGURED, 'zatcaHash'),
      );
    }

    const config = await this.loadZatcaConfig(tenantId);
    const lines = await this.salesOrderLinesRepository.findLinesByOrderId(
      tenantId,
      orderId,
    );

    const invoiceType = order.invoiceType || ZatcaInvoiceType.STANDARD;
    const isSimplified = invoiceType === ZatcaInvoiceType.SIMPLIFIED;
    const transactionType = order.transactionType || ZatcaTransactionType.SALE;
    const isCreditNote = transactionType === ZatcaTransactionType.CREDIT_NOTE;

    const now = new Date();
    const saudiTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const taxRate = this.determineTaxRate(order.taxCategory);

    const invoiceData: ZatcaInvoiceData = {
      id: order.id,
      orderNumber: order.orderNumber,
      uuid: order.zatcaUUID || uuidv4(),
      issueDate: saudiTime.toISOString().split('T')[0],
      issueTime: saudiTime.toISOString().split('T')[1].split('.')[0],
      invoiceTypeCode: isCreditNote ? '381' : '388',
      invoiceTypeCodeName: isSimplified ? '0200000' : '0100000',
      transactionTypeCode: isCreditNote ? '381' : '388',
      currency: order.currency || 'SAR',
      invoiceCounter: order.zatcaInvoiceCounter || 1,
      previousInvoiceHash: config.previousInvoiceHash || GENESIS_HASH,
      notes: order.notes,
      originalInvoiceId: order.originalInvoiceId || null,
      seller: {
        nameEn: config.sellerNameEn,
        nameAr: config.sellerNameAr,
        vatNumber: config.vatNumber,
        street: config.streetEn,
        buildingNumber: config.buildingNumber,
        city: config.cityEn,
        postalCode: config.postalCode,
        district: config.districtEn,
        countryCode: config.countryCode || 'SA',
        crNumber: config.crNumber,
      },
      buyer: isSimplified
        ? null
        : {
            nameEn: order.contactFirstName
              ? `${order.contactFirstName} ${order.contactLastName || ''}`
              : 'Walk-in Customer',
            nameAr: order.contactFirstName
              ? `${order.contactFirstName} ${order.contactLastName || ''}`
              : 'عميل',
            vatNumber: '',
            street: '',
            buildingNumber: '',
            city: '',
            postalCode: '',
            district: '',
            countryCode: 'SA',
          },
      lines: this.mapLines(lines, order.taxCategory),
      subtotal: Number(order.subtotal) || 0,
      discountAmount: Number(order.discountAmount) || 0,
      taxAmount: Number(order.taxAmount) || 0,
      totalAmount: Number(order.totalAmount) || 0,
      taxCategory: order.taxCategory || ZatcaTaxCategory.S,
      taxRate,
      taxExemptionCode: order.taxExemptionCode || null,
      taxExemptionReason: order.taxExemptionReason || null,
      supplyType: order.supplyType || 'goods',
    };

    const xml = this.xmlService.generateXml(invoiceData);
    const signedXml = this.signingService.signInvoice(
      xml,
      config.privateKey,
      config.certificate,
    );

    return signedXml;
  }

  /**
   * Gets the QR code for a simplified invoice.
   */
  async getQrCode(tenantId: string, orderId: string): Promise<string | null> {
    const order = await this.salesOrdersRepository.findOneById(tenantId, orderId);
    if (!order) {
      throw new BadRequestException(
        msg(ErrorMessages.SALES_ORDER_NOT_FOUND, orderId),
      );
    }
    return order.zatcaQRCode || null;
  }

  /**
   * Saves ZATCA configuration settings.
   */
  async saveConfig(
    tenantId: string,
    configData: Record<string, string>,
  ): Promise<void> {
    for (const [key, value] of Object.entries(configData)) {
      if (ZATCA_SETTINGS_KEYS.includes(key as (typeof ZATCA_SETTINGS_KEYS)[number])) {
        await this.tenantSettingsRepository.upsertSetting(tenantId, {
          key,
          value,
          group: 'zatca',
        });
      }
    }
  }

  /**
   * Gets current ZATCA configuration (with sensitive fields masked).
   */
  async getConfig(
    tenantId: string,
  ): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    for (const key of ZATCA_SETTINGS_KEYS) {
      const setting = await this.tenantSettingsRepository.findByKeyTenant(
        tenantId,
        key,
      );
      // Mask sensitive fields
      if (
        key === 'zatcaPrivateKey' ||
        key === 'zatcaApiSecret'
      ) {
        result[key] = setting?.value ? '********' : null;
      } else {
        result[key] = setting?.value ?? null;
      }
    }
    return result;
  }

  /**
   * Atomically increments the invoice counter.
   */
  private async incrementCounter(
    tenantId: string,
    _config: ZatcaConfig,
  ): Promise<number> {
    return this.salesOrdersRepository.getNextInvoiceCounter(tenantId);
  }

  private determineTaxRate(taxCategory: string | null): number {
    switch (taxCategory) {
      case ZatcaTaxCategory.S:
        return 15;
      case ZatcaTaxCategory.Z:
        return 0;
      case ZatcaTaxCategory.E:
        return 0;
      case ZatcaTaxCategory.O:
        return 0;
      default:
        return 15;
    }
  }

  private mapLines(
    lines: any[],
    defaultTaxCategory: string | null,
  ): ZatcaLineData[] {
    return lines.map((line: any, index: number) => ({
      id: line.id || index + 1,
      description: line.description || 'Item',
      quantity: Number(line.quantity) || 0,
      unitPrice: Number(line.unitPrice) || 0,
      discountAmount: Number(line.discountAmount) || 0,
      taxRate: Number(line.taxRate) || 15,
      taxAmount: Number(line.taxAmount) || 0,
      lineTotal: Number(line.lineTotal) || 0,
      taxCategory: defaultTaxCategory || ZatcaTaxCategory.S,
    }));
  }
}
