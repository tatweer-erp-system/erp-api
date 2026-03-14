import { ZatcaXmlService } from './zatca-xml.service';
import { ZatcaInvoiceData } from '../interfaces/zatca.interfaces';

describe('ZatcaXmlService', () => {
  let service: ZatcaXmlService;

  beforeEach(() => {
    service = new ZatcaXmlService();
  });

  const makeInvoiceData = (overrides: Partial<ZatcaInvoiceData> = {}): ZatcaInvoiceData => {
    const defaults: ZatcaInvoiceData = {
      id: 'order-001',
      orderNumber: 'SO-00001',
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      issueDate: '2026-03-14',
      issueTime: '14:30:00',
      invoiceTypeCode: '388',
      invoiceTypeCodeName: '0200000',
      transactionTypeCode: '388',
      currency: 'SAR',
      invoiceCounter: 42,
      previousInvoiceHash: 'abc123previoushash==',
      notes: null,
      originalInvoiceId: null,
      seller: {
        nameEn: 'Acme Corp',
        nameAr: 'شركة أكمي',
        vatNumber: '300000000000003',
        street: '123 Main St',
        buildingNumber: '1234',
        city: 'Riyadh',
        postalCode: '12345',
        district: 'Olaya',
        countryCode: 'SA',
        crNumber: '1010000000',
      },
      buyer: null,
      lines: [
        {
          id: 1,
          description: 'Widget',
          quantity: 2,
          unitPrice: 100,
          discountAmount: 0,
          taxRate: 15,
          taxAmount: 30,
          lineTotal: 200,
          taxCategory: 'S',
        },
      ],
      subtotal: 200,
      discountAmount: 0,
      taxAmount: 30,
      totalAmount: 230,
      taxCategory: 'S',
      taxRate: 15,
      taxExemptionCode: null,
      taxExemptionReason: null,
      supplyType: 'goods',
    };
    return { ...defaults, ...overrides };
  };

  describe('generateXml()', () => {
    it('should produce valid XML with correct namespaces', () => {
      const xml = service.generateXml(makeInvoiceData());

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"');
      expect(xml).toContain(
        'xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
      );
      expect(xml).toContain(
        'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"',
      );
      expect(xml).toContain(
        'xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"',
      );
    });

    it('should contain seller information', () => {
      const xml = service.generateXml(makeInvoiceData());

      expect(xml).toContain('شركة أكمي');
      expect(xml).toContain('300000000000003');
      expect(xml).toContain('1010000000');
      expect(xml).toContain('123 Main St');
      expect(xml).toContain('1234');
      expect(xml).toContain('Riyadh');
      expect(xml).toContain('12345');
      expect(xml).toContain('Olaya');
    });

    it('should contain buyer information for standard invoices', () => {
      const data = makeInvoiceData({
        invoiceTypeCodeName: '0100000',
        buyer: {
          nameEn: 'Customer Inc',
          nameAr: 'شركة العميل',
          vatNumber: '300000000000099',
          street: '456 Side St',
          buildingNumber: '5678',
          city: 'Jeddah',
          postalCode: '54321',
          district: 'Al Hamra',
          countryCode: 'SA',
        },
      });
      const xml = service.generateXml(data);

      expect(xml).toContain('شركة العميل');
      expect(xml).toContain('300000000000099');
      expect(xml).toContain('AccountingCustomerParty');
    });

    it('should not contain buyer section for simplified invoices when buyer is null', () => {
      const data = makeInvoiceData({ buyer: null });
      const xml = service.generateXml(data);

      expect(xml).not.toContain('AccountingCustomerParty');
    });

    it('should contain correct InvoiceTypeCode name for simplified (0200000)', () => {
      const data = makeInvoiceData({ invoiceTypeCodeName: '0200000' });
      const xml = service.generateXml(data);

      expect(xml).toContain('name="0200000"');
    });

    it('should contain correct InvoiceTypeCode name for standard (0100000)', () => {
      const data = makeInvoiceData({ invoiceTypeCodeName: '0100000' });
      const xml = service.generateXml(data);

      expect(xml).toContain('name="0100000"');
    });

    it('should contain line items', () => {
      const xml = service.generateXml(makeInvoiceData());

      expect(xml).toContain('<cac:InvoiceLine>');
      expect(xml).toContain('Widget');
      expect(xml).toContain('unitCode="PCE"');
    });

    it('should format all amounts to 2 decimal places', () => {
      const data = makeInvoiceData({
        subtotal: 100.1,
        discountAmount: 0,
        taxAmount: 15.015,
        totalAmount: 115.115,
        lines: [
          {
            id: 1,
            description: 'Item',
            quantity: 1.5,
            unitPrice: 66.733,
            discountAmount: 0,
            taxRate: 15,
            taxAmount: 15.015,
            lineTotal: 100.1,
            taxCategory: 'S',
          },
        ],
      });
      const xml = service.generateXml(data);

      // Amounts should be formatted to 2 decimal places
      expect(xml).toContain('100.10');
      expect(xml).toContain('15.02'); // Math.round(15.015 * 100) / 100 = 15.02
      expect(xml).toContain('115.12'); // Math.round(115.115 * 100) / 100 = 115.12
      expect(xml).toContain('66.73');
    });

    it('should contain ICV reference', () => {
      const data = makeInvoiceData({ invoiceCounter: 42 });
      const xml = service.generateXml(data);

      expect(xml).toContain('<cbc:ID>ICV</cbc:ID>');
      expect(xml).toContain('42');
    });

    it('should contain PIH reference', () => {
      const data = makeInvoiceData({
        previousInvoiceHash: 'prevhash123==',
      });
      const xml = service.generateXml(data);

      expect(xml).toContain('<cbc:ID>PIH</cbc:ID>');
      expect(xml).toContain('prevhash123==');
    });

    it('should include order-level discount when discountAmount > 0', () => {
      const data = makeInvoiceData({ discountAmount: 10 });
      const xml = service.generateXml(data);

      expect(xml).toContain('<cbc:ChargeIndicator>false</cbc:ChargeIndicator>');
      expect(xml).toContain('<cbc:AllowanceChargeReason>discount</cbc:AllowanceChargeReason>');
      expect(xml).toContain('10.00');
    });

    it('should not include order-level discount when discountAmount is 0', () => {
      const data = makeInvoiceData({ discountAmount: 0 });
      const xml = service.generateXml(data);

      // AllowanceCharge should not appear at the invoice level (may appear in line items)
      const invoiceLevelXml = xml.split('<cac:InvoiceLine>')[0];
      expect(invoiceLevelXml).not.toContain('<cac:AllowanceCharge>');
    });

    it('should include BillingReference for credit notes', () => {
      const data = makeInvoiceData({
        transactionTypeCode: '381',
        originalInvoiceId: 'INV-00099',
      });
      const xml = service.generateXml(data);

      expect(xml).toContain('<cac:BillingReference>');
      expect(xml).toContain('INV-00099');
    });

    it('should include notes when provided', () => {
      const data = makeInvoiceData({ notes: 'Test note' });
      const xml = service.generateXml(data);

      expect(xml).toContain('Test note');
      expect(xml).toContain('languageID="ar"');
    });

    it('should include UBLExtensions placeholder', () => {
      const xml = service.generateXml(makeInvoiceData());

      expect(xml).toContain('<ext:UBLExtensions>');
      expect(xml).toContain('<ext:ExtensionContent/>');
    });

    it('should include tax exemption info when provided', () => {
      const data = makeInvoiceData({
        taxExemptionCode: 'VATEX-SA-29',
        taxExemptionReason: 'Exempt supply',
      });
      const xml = service.generateXml(data);

      expect(xml).toContain('VATEX-SA-29');
      expect(xml).toContain('Exempt supply');
    });

    it('should include multiple line items', () => {
      const data = makeInvoiceData({
        lines: [
          {
            id: 1,
            description: 'Widget A',
            quantity: 2,
            unitPrice: 50,
            discountAmount: 0,
            taxRate: 15,
            taxAmount: 15,
            lineTotal: 100,
            taxCategory: 'S',
          },
          {
            id: 2,
            description: 'Widget B',
            quantity: 3,
            unitPrice: 30,
            discountAmount: 5,
            taxRate: 15,
            taxAmount: 12.75,
            lineTotal: 90,
            taxCategory: 'S',
          },
        ],
      });
      const xml = service.generateXml(data);

      expect(xml).toContain('Widget A');
      expect(xml).toContain('Widget B');
      // Count InvoiceLine occurrences
      const lineCount = (xml.match(/<cac:InvoiceLine>/g) || []).length;
      expect(lineCount).toBe(2);
    });
  });
});
