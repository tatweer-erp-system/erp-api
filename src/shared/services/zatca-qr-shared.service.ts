import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { QrFields } from '@/modules/zatca/interfaces/zatca.interfaces';

@Injectable()
export class ZatcaQrSharedService {
  /**
   * Generates a TLV-encoded QR code as a base64 PNG image.
   * Tags 1-8 per ZATCA specification.
   */
  async generateQr(fields: QrFields): Promise<string> {
    const tlvBuffer = this.encodeTlv(fields);
    const base64Tlv = tlvBuffer.toString('base64');
    const qrDataUrl: string = await QRCode.toDataURL(base64Tlv, {
      errorCorrectionLevel: 'M',
      width: 300,
    });
    return qrDataUrl;
  }

  /**
   * Encodes QR fields into TLV (Tag-Length-Value) format.
   * Tag 1: Seller name
   * Tag 2: VAT registration number
   * Tag 3: Timestamp (ISO 8601)
   * Tag 4: Invoice total (with VAT)
   * Tag 5: VAT amount
   * Tag 6: Invoice hash
   * Tag 7: ECDSA signature
   * Tag 8: Public key
   */
  private encodeTlv(fields: QrFields): Buffer {
    const entries: Buffer[] = [];

    entries.push(this.tlvEntry(1, Buffer.from(fields.sellerName, 'utf8')));
    entries.push(this.tlvEntry(2, Buffer.from(fields.vatNumber, 'utf8')));
    entries.push(this.tlvEntry(3, Buffer.from(fields.timestamp, 'utf8')));
    entries.push(this.tlvEntry(4, Buffer.from(fields.totalWithVat, 'utf8')));
    entries.push(this.tlvEntry(5, Buffer.from(fields.vatAmount, 'utf8')));
    entries.push(this.tlvEntry(6, Buffer.from(fields.xmlHash, 'base64')));
    entries.push(this.tlvEntry(7, Buffer.from(fields.signature, 'base64')));
    entries.push(this.tlvEntry(8, Buffer.from(fields.publicKey, 'base64')));

    return Buffer.concat(entries);
  }

  private tlvEntry(tag: number, value: Buffer): Buffer {
    const tagBuf = Buffer.alloc(1);
    tagBuf.writeUInt8(tag, 0);

    const lenBuf = Buffer.alloc(1);
    lenBuf.writeUInt8(value.length, 0);

    return Buffer.concat([tagBuf, lenBuf, value]);
  }
}
