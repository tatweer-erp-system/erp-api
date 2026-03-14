import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ZatcaPortalResponse } from '../interfaces/zatca.interfaces';

const SANDBOX_BASE_URL =
  'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal';
const PRODUCTION_BASE_URL =
  'https://gw-fatoora.zatca.gov.sa/e-invoicing/core';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

@Injectable()
export class ZatcaPortalService {
  private readonly logger = new Logger(ZatcaPortalService.name);

  /**
   * Reports a simplified invoice to ZATCA.
   */
  async reportSimplified(
    signedXmlBase64: string,
    invoiceHash: string,
    uuid: string,
    environment: 'sandbox' | 'production',
    apiSecret: string,
    certificateBase64: string,
  ): Promise<ZatcaPortalResponse> {
    const baseUrl =
      environment === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
    const url = `${baseUrl}/invoices/reporting/single`;

    return this.submitToPortal(
      url,
      signedXmlBase64,
      invoiceHash,
      uuid,
      apiSecret,
      certificateBase64,
    );
  }

  /**
   * Submits a standard invoice for clearance.
   */
  async clearStandard(
    signedXmlBase64: string,
    invoiceHash: string,
    uuid: string,
    environment: 'sandbox' | 'production',
    apiSecret: string,
    certificateBase64: string,
  ): Promise<ZatcaPortalResponse> {
    const baseUrl =
      environment === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
    const url = `${baseUrl}/invoices/clearance/single`;

    return this.submitToPortal(
      url,
      signedXmlBase64,
      invoiceHash,
      uuid,
      apiSecret,
      certificateBase64,
    );
  }

  private async submitToPortal(
    url: string,
    signedXmlBase64: string,
    invoiceHash: string,
    uuid: string,
    apiSecret: string,
    certificateBase64: string,
  ): Promise<ZatcaPortalResponse> {
    const body = {
      invoiceHash,
      uuid,
      invoice: signedXmlBase64,
    };

    const certClean = certificateBase64
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');

    const authToken = Buffer.from(`${certClean}:${apiSecret}`).toString(
      'base64',
    );

    const headers = {
      'Content-Type': 'application/json',
      'Accept-Version': 'V2',
      'Accept-Language': 'en',
      Authorization: `Basic ${authToken}`,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await axios.post<ZatcaPortalResponse>(url, body, {
          headers,
          timeout: 30000,
        });
        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        const statusCode = axiosError.response?.status;

        // Do not retry 4xx errors
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          this.logger.error(
            `ZATCA portal returned ${statusCode}: ${JSON.stringify(axiosError.response?.data)}`,
          );
          return (axiosError.response?.data as ZatcaPortalResponse) ?? {};
        }

        lastError = axiosError;
        this.logger.warn(
          `ZATCA portal attempt ${attempt + 1}/${MAX_RETRIES} failed: ${axiosError.message}`,
        );

        if (attempt < MAX_RETRIES - 1) {
          const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          await this.delay(backoffMs);
        }
      }
    }

    this.logger.error(
      `ZATCA portal submission failed after ${MAX_RETRIES} retries: ${lastError?.message}`,
    );
    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
