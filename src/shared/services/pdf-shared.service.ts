import { Injectable } from '@nestjs/common';
import { PdfService as InfraPdfService } from '@/infrastructure/pdf/pdf.service';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfSharedService {
  constructor(private readonly pdfService: InfraPdfService) {}

  async generateFromHtml(html: string, options?: puppeteer.PDFOptions): Promise<Buffer> {
    return this.pdfService.generateFromHtml(html, options);
  }

  async generateFromUrl(url: string, options?: puppeteer.PDFOptions): Promise<Buffer> {
    return this.pdfService.generateFromUrl(url, options);
  }
}
