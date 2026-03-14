import { Module, Global } from '@nestjs/common';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { ExcelGeneratorService } from './services/excel-generator.service';

@Global()
@Module({
  providers: [PdfGeneratorService, ExcelGeneratorService],
  exports: [PdfGeneratorService, ExcelGeneratorService],
})
export class CommonModule {}
