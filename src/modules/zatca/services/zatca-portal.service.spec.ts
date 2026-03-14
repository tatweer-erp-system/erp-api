import { ZatcaPortalService } from './zatca-portal.service';

jest.mock('axios', () => ({
  post: jest.fn(),
  __esModule: true,
  default: { post: jest.fn() },
}));

// Get the mocked axios - the service imports `axios` and uses `axios.post`
import axios from 'axios';
const mockedAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe('ZatcaPortalService', () => {
  let service: ZatcaPortalService;

  const signedXmlBase64 = 'dGVzdHhtbA==';
  const invoiceHash = 'testhash123==';
  const uuid = '550e8400-e29b-41d4-a716-446655440000';
  const apiSecret = 'test-secret';
  const certificateBase64 = 'test-certificate-base64';

  beforeEach(() => {
    service = new ZatcaPortalService();
    jest.clearAllMocks();
    // Suppress logger output
    jest.spyOn((service as any).logger, 'error').mockImplementation();
    jest.spyOn((service as any).logger, 'warn').mockImplementation();
    // Speed up retry tests by mocking delay
    (service as any).delay = jest.fn().mockResolvedValue(undefined);
  });

  describe('reportSimplified()', () => {
    it('should call the correct sandbox reporting endpoint', async () => {
      mockedAxiosPost.mockResolvedValueOnce({
        data: { reportingStatus: 'REPORTED' },
      });

      await service.reportSimplified(
        signedXmlBase64,
        invoiceHash,
        uuid,
        'sandbox',
        apiSecret,
        certificateBase64,
      );

      expect(mockedAxiosPost).toHaveBeenCalledWith(
        'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/reporting/single',
        expect.objectContaining({
          invoiceHash,
          uuid,
          invoice: signedXmlBase64,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept-Version': 'V2',
          }),
        }),
      );
    });

    it('should call the correct production reporting endpoint', async () => {
      mockedAxiosPost.mockResolvedValueOnce({
        data: { reportingStatus: 'REPORTED' },
      });

      await service.reportSimplified(
        signedXmlBase64,
        invoiceHash,
        uuid,
        'production',
        apiSecret,
        certificateBase64,
      );

      expect(mockedAxiosPost).toHaveBeenCalledWith(
        'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/reporting/single',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('clearStandard()', () => {
    it('should call the correct sandbox clearance endpoint', async () => {
      mockedAxiosPost.mockResolvedValueOnce({
        data: { clearanceStatus: 'CLEARED' },
      });

      await service.clearStandard(
        signedXmlBase64,
        invoiceHash,
        uuid,
        'sandbox',
        apiSecret,
        certificateBase64,
      );

      expect(mockedAxiosPost).toHaveBeenCalledWith(
        'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/clearance/single',
        expect.objectContaining({
          invoiceHash,
          uuid,
          invoice: signedXmlBase64,
        }),
        expect.any(Object),
      );
    });

    it('should call the correct production clearance endpoint', async () => {
      mockedAxiosPost.mockResolvedValueOnce({
        data: { clearanceStatus: 'CLEARED' },
      });

      await service.clearStandard(
        signedXmlBase64,
        invoiceHash,
        uuid,
        'production',
        apiSecret,
        certificateBase64,
      );

      expect(mockedAxiosPost).toHaveBeenCalledWith(
        'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/clearance/single',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('retry logic', () => {
    it('should retry up to 3 times on 5xx responses', async () => {
      const error5xx = {
        response: { status: 500, data: {} },
        message: 'Internal Server Error',
      };

      mockedAxiosPost
        .mockRejectedValueOnce(error5xx)
        .mockRejectedValueOnce(error5xx)
        .mockRejectedValueOnce(error5xx);

      await expect(
        service.reportSimplified(
          signedXmlBase64,
          invoiceHash,
          uuid,
          'sandbox',
          apiSecret,
          certificateBase64,
        ),
      ).rejects.toBeDefined();

      expect(mockedAxiosPost).toHaveBeenCalledTimes(3);
    });

    it('should succeed on second attempt after first 5xx failure', async () => {
      const error5xx = {
        response: { status: 503, data: {} },
        message: 'Service Unavailable',
      };

      mockedAxiosPost
        .mockRejectedValueOnce(error5xx)
        .mockResolvedValueOnce({
          data: { reportingStatus: 'REPORTED' },
        });

      const result = await service.reportSimplified(
        signedXmlBase64,
        invoiceHash,
        uuid,
        'sandbox',
        apiSecret,
        certificateBase64,
      );

      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);
      expect(result.reportingStatus).toBe('REPORTED');
    });

    it('should not retry on 4xx responses', async () => {
      const error4xx = {
        response: { status: 400, data: { reportingStatus: 'ERROR' } },
        message: 'Bad Request',
      };

      mockedAxiosPost.mockRejectedValueOnce(error4xx);

      const result = await service.reportSimplified(
        signedXmlBase64,
        invoiceHash,
        uuid,
        'sandbox',
        apiSecret,
        certificateBase64,
      );

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(result.reportingStatus).toBe('ERROR');
    });

    it('should not retry on 404 responses', async () => {
      const error404 = {
        response: { status: 404, data: {} },
        message: 'Not Found',
      };

      mockedAxiosPost.mockRejectedValueOnce(error404);

      const result = await service.clearStandard(
        signedXmlBase64,
        invoiceHash,
        uuid,
        'sandbox',
        apiSecret,
        certificateBase64,
      );

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    });
  });
});
