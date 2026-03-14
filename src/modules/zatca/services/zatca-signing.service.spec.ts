import { ZatcaSigningService } from './zatca-signing.service';

describe('ZatcaSigningService', () => {
  let service: ZatcaSigningService;

  beforeEach(() => {
    service = new ZatcaSigningService();
  });

  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ID>SO-00001</cbc:ID>
  <cbc:UUID>550e8400-e29b-41d4-a716-446655440000</cbc:UUID>
  <cbc:IssueDate>2026-03-14</cbc:IssueDate>
</Invoice>`;

  // Must exactly match the regex-stripped version: the regex replaces the
  // <ext:UBLExtensions>...</ext:UBLExtensions> block with '' (empty string)
  const sampleXmlWithoutExtensions = sampleXml.replace(
    /<ext:UBLExtensions>[\s\S]*?<\/ext:UBLExtensions>/,
    '',
  );

  describe('hashInvoice()', () => {
    it('should return a base64-encoded string', () => {
      const hash = service.hashInvoice(sampleXml);

      // Base64 pattern: alphanumeric, +, /, and = for padding
      expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should remove UBLExtensions before hashing', () => {
      // Hash of the XML with UBLExtensions should equal hash of manually stripped XML
      const hashWithExtensions = service.hashInvoice(sampleXml);
      const hashWithoutExtensions = service.hashInvoice(sampleXmlWithoutExtensions);

      expect(hashWithExtensions).toBe(hashWithoutExtensions);
    });

    it('should produce consistent hashes for the same input', () => {
      const hash1 = service.hashInvoice(sampleXml);
      const hash2 = service.hashInvoice(sampleXml);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = service.hashInvoice(sampleXml);
      const hash2 = service.hashInvoice(sampleXml + '<extra/>');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('extractSignatureValue()', () => {
    it('should extract signature value from signed XML', () => {
      const signedXml = `<root>
        <ds:Signature>
          <ds:SignatureValue>ABCD1234SignatureHere==</ds:SignatureValue>
        </ds:Signature>
      </root>`;

      const result = service.extractSignatureValue(signedXml);

      expect(result).toBe('ABCD1234SignatureHere==');
    });

    it('should handle multiline signature values', () => {
      const signedXml = `<root>
        <ds:Signature>
          <ds:SignatureValue>ABCD1234
          SignatureHere==</ds:SignatureValue>
        </ds:Signature>
      </root>`;

      const result = service.extractSignatureValue(signedXml);

      expect(result).toBe('ABCD1234SignatureHere==');
    });

    it('should return empty string when no signature is present', () => {
      const xml = '<root><data>no signature here</data></root>';

      const result = service.extractSignatureValue(xml);

      expect(result).toBe('');
    });
  });
});
