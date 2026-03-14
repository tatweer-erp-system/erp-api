import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface ExcelSheetColumn {
  key: string;
  header: string;
  width?: number;
}

export interface ExcelSheet {
  name: string;
  columns: ExcelSheetColumn[];
  rows: Record<string, unknown>[];
}

export interface ExcelGenerateOptions {
  title: string;
  sheets: ExcelSheet[];
}

@Injectable()
export class ExcelGeneratorService {
  async generateWorkbook(options: ExcelGenerateOptions): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tatweer ERP';
    workbook.created = new Date();

    for (const sheetConfig of options.sheets) {
      const worksheet = workbook.addWorksheet(sheetConfig.name);

      // Set columns
      worksheet.columns = sheetConfig.columns.map((col) => ({
        header: col.header,
        key: col.key,
        width: col.width ?? 18,
      }));

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E79' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 24;

      // Add data rows
      sheetConfig.rows.forEach((rowData, rowIdx) => {
        const row = worksheet.addRow(rowData);

        // Alternating row shading
        if (rowIdx % 2 === 1) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' },
          };
        }

        // Format cells — right-align numbers, apply number format for currency columns
        row.eachCell((cell) => {
          const val = cell.value;
          if (typeof val === 'number') {
            cell.alignment = { horizontal: 'right' };
            cell.numFmt = '#,##0.00';
          }
        });
      });

      // Auto-filter on header row
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheetConfig.columns.length },
      };

      // Freeze top row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
