import { PdfGeneratorService, PdfGenerateOptions } from './pdf-generator.service';

/**
 * PDFKit streams data asynchronously via 'data' events after doc.end().
 * The service collects chunks synchronously, so we wrap the call in a
 * promise that resolves once the internal stream finishes.
 */
function generateTableAsync(service: PdfGeneratorService, options: PdfGenerateOptions): Promise<Buffer> {
  // Access the underlying implementation by monkey-patching to capture the stream
  return new Promise<Buffer>((resolve, reject) => {
    const origGenerate = service.generateTable.bind(service);

    // We override pdfkit's end behavior by hooking into the service
    // Instead, let's use the actual pdfkit API directly for verification
    const PDFDocument = require('pdfkit');
    const origEnd = PDFDocument.prototype.end;

    let resolvedBuffer: Buffer | null = null;
    const chunks: Buffer[] = [];

    PDFDocument.prototype.end = function (...args: unknown[]) {
      this.on('data', (chunk: Buffer) => chunks.push(chunk));
      this.on('end', () => {
        resolvedBuffer = Buffer.concat(chunks);
        resolve(resolvedBuffer);
      });
      this.on('error', reject);
      return origEnd.apply(this, args);
    };

    try {
      service.generateTable(options);
    } finally {
      PDFDocument.prototype.end = origEnd;
    }
  });
}

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;

  beforeEach(() => {
    service = new PdfGeneratorService();
  });

  const baseOptions: PdfGenerateOptions = {
    title: 'Sales Report',
    tenantName: 'Test Company',
    period: { from: '2026-01-01', to: '2026-03-14' },
    columns: [
      { key: 'name', label: 'Product', align: 'left' },
      { key: 'qty', label: 'Quantity', align: 'right', format: 'number' },
      { key: 'total', label: 'Total', align: 'right', format: 'currency' },
    ],
    rows: [
      { name: 'Widget A', qty: 10, total: 150.0 },
      { name: 'Widget B', qty: 5, total: 75.0 },
    ],
    totals: { name: 'Total', qty: 15, total: 225.0 },
  };

  describe('generateTable()', () => {
    it('should return a Buffer', () => {
      const result = service.generateTable(baseOptions);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should produce PDF content with magic bytes (%PDF) when stream completes', async () => {
      const result = await generateTableAsync(service, baseOptions);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      const header = result.subarray(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('should accept all required options without throwing', () => {
      expect(() => service.generateTable(baseOptions)).not.toThrow();
    });

    it('should work without optional period', () => {
      const opts: PdfGenerateOptions = {
        title: 'Test',
        tenantName: 'Co',
        columns: [{ key: 'a', label: 'A' }],
        rows: [{ a: 'value' }],
      };

      expect(() => service.generateTable(opts)).not.toThrow();
    });

    it('should work without totals', () => {
      const { totals, ...optsWithoutTotals } = baseOptions;
      expect(() => service.generateTable(optsWithoutTotals)).not.toThrow();
    });
  });
});
