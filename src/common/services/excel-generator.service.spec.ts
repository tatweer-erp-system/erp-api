import { ExcelGeneratorService, ExcelGenerateOptions } from './excel-generator.service';

describe('ExcelGeneratorService', () => {
  let service: ExcelGeneratorService;

  beforeEach(() => {
    service = new ExcelGeneratorService();
  });

  const baseOptions: ExcelGenerateOptions = {
    title: 'Sales Report',
    sheets: [
      {
        name: 'Sales',
        columns: [
          { key: 'name', header: 'Product', width: 20 },
          { key: 'qty', header: 'Quantity', width: 10 },
          { key: 'total', header: 'Total', width: 15 },
        ],
        rows: [
          { name: 'Widget A', qty: 10, total: 150.0 },
          { name: 'Widget B', qty: 5, total: 75.0 },
        ],
      },
    ],
  };

  describe('generateWorkbook()', () => {
    it('should return a Buffer', async () => {
      const result = await service.generateWorkbook(baseOptions);

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should return valid XLSX (starts with PK zip signature)', async () => {
      const result = await service.generateWorkbook(baseOptions);

      // XLSX files are ZIP archives, which start with PK (0x50 0x4B)
      expect(result[0]).toBe(0x50); // P
      expect(result[1]).toBe(0x4b); // K
    });

    it('should handle multiple sheets', async () => {
      const multiSheetOptions: ExcelGenerateOptions = {
        title: 'Multi-sheet Report',
        sheets: [
          {
            name: 'Sheet1',
            columns: [{ key: 'a', header: 'Col A' }],
            rows: [{ a: 'value1' }],
          },
          {
            name: 'Sheet2',
            columns: [{ key: 'b', header: 'Col B' }],
            rows: [{ b: 'value2' }],
          },
          {
            name: 'Sheet3',
            columns: [{ key: 'c', header: 'Col C' }],
            rows: [{ c: 'value3' }],
          },
        ],
      };

      const result = await service.generateWorkbook(multiSheetOptions);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Still a valid ZIP/XLSX
      expect(result[0]).toBe(0x50);
      expect(result[1]).toBe(0x4b);
    });
  });
});
