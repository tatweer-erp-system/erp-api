import { Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import { ZatcaInvoiceData } from '@/modules/zatca/interfaces/zatca.interfaces';

@Injectable()
export class ZatcaXmlSharedService {
  /**
   * Generates UBL 2.1 XML for a ZATCA invoice.
   */
  generateXml(data: ZatcaInvoiceData): string {
    const doc = create({ version: '1.0', encoding: 'UTF-8' });

    const invoice = doc.ele('Invoice', {
      xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      'xmlns:ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
    });

    // UBLExtensions — placeholder for signature
    const ublExtensions = invoice.ele('ext:UBLExtensions');
    const ext = ublExtensions.ele('ext:UBLExtension');
    ext.ele('ext:ExtensionURI').txt('urn:oasis:names:specification:ubl:dsig:enveloped:xades');
    ext.ele('ext:ExtensionContent');

    // ProfileID
    invoice.ele('cbc:ProfileID').txt('reporting:1.0');

    // ID
    invoice.ele('cbc:ID').txt(data.orderNumber);

    // UUID
    invoice.ele('cbc:UUID').txt(data.uuid);

    // IssueDate
    invoice.ele('cbc:IssueDate').txt(data.issueDate);

    // IssueTime
    invoice.ele('cbc:IssueTime').txt(data.issueTime);

    // InvoiceTypeCode
    invoice
      .ele('cbc:InvoiceTypeCode', { name: data.invoiceTypeCodeName })
      .txt(data.invoiceTypeCode);

    // Note
    if (data.notes) {
      invoice.ele('cbc:Note', { languageID: 'ar' }).txt(data.notes);
    }

    // DocumentCurrencyCode
    invoice.ele('cbc:DocumentCurrencyCode').txt(data.currency);

    // TaxCurrencyCode
    invoice.ele('cbc:TaxCurrencyCode').txt('SAR');

    // AdditionalDocumentReference — ICV (Invoice Counter Value)
    const icvRef = invoice.ele('cac:AdditionalDocumentReference');
    icvRef.ele('cbc:ID').txt('ICV');
    icvRef.ele('cbc:UUID').txt(String(data.invoiceCounter));

    // AdditionalDocumentReference — PIH (Previous Invoice Hash)
    const pihRef = invoice.ele('cac:AdditionalDocumentReference');
    pihRef.ele('cbc:ID').txt('PIH');
    const pihAttachment = pihRef.ele('cac:Attachment');
    pihAttachment
      .ele('cbc:EmbeddedDocumentBinaryObject', { mimeCode: 'text/plain' })
      .txt(data.previousInvoiceHash);

    // BillingReference — for credit notes
    if (data.originalInvoiceId && data.transactionTypeCode === '381') {
      const billingRef = invoice.ele('cac:BillingReference');
      const invoiceDocRef = billingRef.ele('cac:InvoiceDocumentReference');
      invoiceDocRef.ele('cbc:ID').txt(data.originalInvoiceId);
    }

    // AccountingSupplierParty
    this.addParty(invoice, 'cac:AccountingSupplierParty', data.seller);

    // AccountingCustomerParty (for standard invoices)
    if (data.buyer) {
      this.addParty(invoice, 'cac:AccountingCustomerParty', data.buyer);
    }

    // PaymentMeans
    const paymentMeans = invoice.ele('cac:PaymentMeans');
    paymentMeans.ele('cbc:PaymentMeansCode').txt('10');

    // AllowanceCharge (order-level discount)
    if (data.discountAmount > 0) {
      const allowance = invoice.ele('cac:AllowanceCharge');
      allowance.ele('cbc:ChargeIndicator').txt('false');
      allowance.ele('cbc:AllowanceChargeReason').txt('discount');
      allowance.ele('cbc:Amount', { currencyID: data.currency }).txt(this.fmt(data.discountAmount));
      const allowanceTaxCategory = allowance.ele('cac:TaxCategory');
      allowanceTaxCategory.ele('cbc:ID').txt(data.taxCategory);
      allowanceTaxCategory.ele('cbc:Percent').txt(this.fmt(data.taxRate));
      allowanceTaxCategory.ele('cac:TaxScheme').ele('cbc:ID').txt('VAT');
    }

    // TaxTotal
    const taxTotal = invoice.ele('cac:TaxTotal');
    taxTotal.ele('cbc:TaxAmount', { currencyID: data.currency }).txt(this.fmt(data.taxAmount));

    const taxSubtotal = taxTotal.ele('cac:TaxSubtotal');
    taxSubtotal
      .ele('cbc:TaxableAmount', { currencyID: data.currency })
      .txt(this.fmt(data.subtotal - data.discountAmount));
    taxSubtotal.ele('cbc:TaxAmount', { currencyID: data.currency }).txt(this.fmt(data.taxAmount));
    const taxCategory = taxSubtotal.ele('cac:TaxCategory');
    taxCategory.ele('cbc:ID').txt(data.taxCategory);
    taxCategory.ele('cbc:Percent').txt(this.fmt(data.taxRate));
    if (data.taxExemptionCode) {
      taxCategory.ele('cbc:TaxExemptionReasonCode').txt(data.taxExemptionCode);
    }
    if (data.taxExemptionReason) {
      taxCategory.ele('cbc:TaxExemptionReason').txt(data.taxExemptionReason);
    }
    taxCategory.ele('cac:TaxScheme').ele('cbc:ID').txt('VAT');

    // TaxTotal (SAR copy)
    const taxTotalSar = invoice.ele('cac:TaxTotal');
    taxTotalSar.ele('cbc:TaxAmount', { currencyID: 'SAR' }).txt(this.fmt(data.taxAmount));

    // LegalMonetaryTotal
    const legalTotal = invoice.ele('cac:LegalMonetaryTotal');
    legalTotal
      .ele('cbc:LineExtensionAmount', { currencyID: data.currency })
      .txt(this.fmt(data.subtotal));
    legalTotal
      .ele('cbc:TaxExclusiveAmount', { currencyID: data.currency })
      .txt(this.fmt(data.subtotal - data.discountAmount));
    legalTotal
      .ele('cbc:TaxInclusiveAmount', { currencyID: data.currency })
      .txt(this.fmt(data.totalAmount));
    if (data.discountAmount > 0) {
      legalTotal
        .ele('cbc:AllowanceTotalAmount', { currencyID: data.currency })
        .txt(this.fmt(data.discountAmount));
    }
    legalTotal
      .ele('cbc:PayableAmount', { currencyID: data.currency })
      .txt(this.fmt(data.totalAmount));

    // InvoiceLines
    for (const line of data.lines) {
      this.addInvoiceLine(invoice, line, data.currency, data.taxCategory);
    }

    return doc.end({ prettyPrint: true });
  }

  private addParty(
    parent: ReturnType<ReturnType<typeof create>['ele']>,
    tag: string,
    party: {
      nameEn: string;
      nameAr: string;
      vatNumber: string;
      street: string;
      buildingNumber: string;
      city: string;
      postalCode: string;
      district: string;
      countryCode: string;
      crNumber?: string;
    },
  ): void {
    const wrapper = parent.ele(tag);
    const partyEle = wrapper.ele('cac:Party');

    // PartyIdentification (CRN)
    if (party.crNumber) {
      const partyId = partyEle.ele('cac:PartyIdentification');
      partyId.ele('cbc:ID', { schemeID: 'CRN' }).txt(party.crNumber);
    }

    // PostalAddress
    const address = partyEle.ele('cac:PostalAddress');
    address.ele('cbc:StreetName').txt(party.street);
    address.ele('cbc:BuildingNumber').txt(party.buildingNumber);
    address.ele('cbc:CityName').txt(party.city);
    address.ele('cbc:PostalZone').txt(party.postalCode);
    address.ele('cbc:CitySubdivisionName').txt(party.district);
    address.ele('cac:Country').ele('cbc:IdentificationCode').txt(party.countryCode);

    // PartyTaxScheme
    const taxScheme = partyEle.ele('cac:PartyTaxScheme');
    taxScheme.ele('cbc:CompanyID').txt(party.vatNumber);
    taxScheme.ele('cac:TaxScheme').ele('cbc:ID').txt('VAT');

    // PartyLegalEntity
    const legalEntity = partyEle.ele('cac:PartyLegalEntity');
    legalEntity.ele('cbc:RegistrationName').txt(party.nameAr);
  }

  private addInvoiceLine(
    parent: ReturnType<ReturnType<typeof create>['ele']>,
    line: {
      id: number;
      description: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      taxRate: number;
      taxAmount: number;
      lineTotal: number;
      taxCategory: string;
    },
    currency: string,
    defaultTaxCategory: string,
  ): void {
    const invoiceLine = parent.ele('cac:InvoiceLine');
    invoiceLine.ele('cbc:ID').txt(String(line.id));
    invoiceLine.ele('cbc:InvoicedQuantity', { unitCode: 'PCE' }).txt(this.fmt(line.quantity));
    invoiceLine
      .ele('cbc:LineExtensionAmount', { currencyID: currency })
      .txt(this.fmt(line.lineTotal));

    // Line-level discount
    if (line.discountAmount > 0) {
      const allowance = invoiceLine.ele('cac:AllowanceCharge');
      allowance.ele('cbc:ChargeIndicator').txt('false');
      allowance.ele('cbc:AllowanceChargeReason').txt('discount');
      allowance.ele('cbc:Amount', { currencyID: currency }).txt(this.fmt(line.discountAmount));
    }

    // TaxTotal
    const taxTotal = invoiceLine.ele('cac:TaxTotal');
    taxTotal.ele('cbc:TaxAmount', { currencyID: currency }).txt(this.fmt(line.taxAmount));
    taxTotal
      .ele('cbc:RoundingAmount', { currencyID: currency })
      .txt(this.fmt(line.lineTotal + line.taxAmount));

    // Item
    const item = invoiceLine.ele('cac:Item');
    item.ele('cbc:Name').txt(line.description || 'Item');

    const classifiedTax = item.ele('cac:ClassifiedTaxCategory');
    classifiedTax.ele('cbc:ID').txt(line.taxCategory || defaultTaxCategory);
    classifiedTax.ele('cbc:Percent').txt(this.fmt(line.taxRate));
    classifiedTax.ele('cac:TaxScheme').ele('cbc:ID').txt('VAT');

    // Price
    const price = invoiceLine.ele('cac:Price');
    price.ele('cbc:PriceAmount', { currencyID: currency }).txt(this.fmt(line.unitPrice));
  }

  private fmt(n: number): string {
    return (Math.round(n * 100) / 100).toFixed(2);
  }
}
