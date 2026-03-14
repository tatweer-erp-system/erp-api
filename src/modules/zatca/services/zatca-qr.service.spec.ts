import { ZatcaQrService } from './zatca-qr.service';
import { QrFields } from '../interfaces/zatca.interfaces';

// Mock qrcode module
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,iVBORw0KGgo='),
}));

describe('ZatcaQrService', () => {
  let service: ZatcaQrService;

  beforeEach(() => {
    service = new ZatcaQrService();
    jest.clearAllMocks();
  });

  const makeQrFields = (): QrFields => ({
    sellerName: 'شركة أكمي',
    vatNumber: '300000000000003',
    timestamp: '2026-03-14T14:30:00.000Z',
    totalWithVat: '230.00',
    vatAmount: '30.00',
    xmlHash: Buffer.from('testhash').toString('base64'),
    signature: Buffer.from('testsignature').toString('base64'),
    publicKey: Buffer.from('testpublickey').toString('base64'),
  });

  describe('TLV encoding', () => {
    it('should produce correct TLV buffer structure (tag byte, length byte, value bytes)', () => {
      // Access the private method through type assertion
      const encodeTlv = (service as any).encodeTlv.bind(service);
      const fields = makeQrFields();
      const buffer: Buffer = encodeTlv(fields);

      // Verify first TLV entry: tag 1, seller name
      expect(buffer[0]).toBe(1); // tag byte
      const sellerNameBytes = Buffer.from(fields.sellerName, 'utf8');
      expect(buffer[1]).toBe(sellerNameBytes.length); // length byte
      const extractedName = buffer.subarray(2, 2 + sellerNameBytes.length);
      expect(extractedName.toString('utf8')).toBe(fields.sellerName);
    });

    it('should include all 8 TLV tags in the encoded buffer', () => {
      const encodeTlv = (service as any).encodeTlv.bind(service);
      const fields = makeQrFields();
      const buffer: Buffer = encodeTlv(fields);

      // Walk through the buffer and extract tag bytes
      const tags: number[] = [];
      let offset = 0;
      while (offset < buffer.length) {
        const tag = buffer[offset];
        const len = buffer[offset + 1];
        tags.push(tag);
        offset += 2 + len;
      }

      expect(tags).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('should encode each TLV entry as [tag(1 byte), length(1 byte), value(N bytes)]', () => {
      const encodeTlv = (service as any).encodeTlv.bind(service);
      const fields = makeQrFields();
      const buffer: Buffer = encodeTlv(fields);

      // Walk through all entries and verify structure
      let offset = 0;
      let entryCount = 0;
      while (offset < buffer.length) {
        const tag = buffer[offset];
        const len = buffer[offset + 1];

        expect(tag).toBeGreaterThanOrEqual(1);
        expect(tag).toBeLessThanOrEqual(8);
        expect(len).toBeGreaterThan(0);
        expect(offset + 2 + len).toBeLessThanOrEqual(buffer.length);

        offset += 2 + len;
        entryCount++;
      }

      expect(entryCount).toBe(8);
      expect(offset).toBe(buffer.length); // no leftover bytes
    });
  });

  describe('generateQr()', () => {
    it('should return a base64 data URL string', async () => {
      const result = await service.generateQr(makeQrFields());

      expect(result).toContain('data:image/png;base64,');
    });

    it('should call QRCode.toDataURL with base64-encoded TLV', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const QRCode = require('qrcode');
      await service.generateQr(makeQrFields());

      expect(QRCode.toDataURL).toHaveBeenCalledTimes(1);
      const [encodedData, options] = QRCode.toDataURL.mock.calls[0];
      // The input to QRCode should be a base64 string of the TLV buffer
      expect(typeof encodedData).toBe('string');
      // Verify it's valid base64 by decoding
      expect(() => Buffer.from(encodedData, 'base64')).not.toThrow();
      expect(options).toEqual({
        errorCorrectionLevel: 'M',
        width: 300,
      });
    });
  });
});
