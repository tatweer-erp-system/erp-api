import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as forge from 'node-forge';

@Injectable()
export class ZatcaSigningService {
  /**
   * Hashes the invoice XML by removing UBLExtensions and computing SHA-256 (Base64).
   */
  hashInvoice(xml: string): string {
    const strippedXml = this.removeUblExtensions(xml);
    const hash = crypto.createHash('sha256').update(strippedXml, 'utf8').digest('base64');
    return hash;
  }

  /**
   * Signs the invoice XML using ECDSA with the private key.
   * Inserts the ds:Signature element into UBLExtensions/ExtensionContent.
   */
  signInvoice(xml: string, privateKeyPem: string, certificatePem: string): string {
    const invoiceHash = this.hashInvoice(xml);

    // Compute signature using ECDSA (secp256k1)
    const sign = crypto.createSign('SHA256');
    sign.update(invoiceHash);
    sign.end();
    const signatureValue = sign.sign(privateKeyPem, 'base64');

    // Get certificate digest
    const certDer = this.pemToDer(certificatePem);
    const certHash = crypto.createHash('sha256').update(certDer).digest('base64');

    // Build the ds:Signature XML
    const signatureXml = this.buildSignatureXml(
      invoiceHash,
      signatureValue,
      certificatePem,
      certHash,
    );

    // Insert into UBLExtensions/ExtensionContent
    const signedXml = this.insertSignature(xml, signatureXml);
    return signedXml;
  }

  /**
   * Extracts the Base64 signature value from a signed XML.
   */
  extractSignatureValue(signedXml: string): string {
    const match = signedXml.match(/<ds:SignatureValue>([\s\S]*?)<\/ds:SignatureValue>/);
    return match ? match[1].replace(/\s/g, '') : '';
  }

  /**
   * Extracts the public key from a PEM certificate.
   */
  extractPublicKey(certificatePem: string): Buffer {
    const cert = forge.pki.certificateFromPem(certificatePem);
    const publicKeyDer = forge.asn1.toDer(forge.pki.publicKeyToAsn1(cert.publicKey));
    return Buffer.from(publicKeyDer.getBytes(), 'binary');
  }

  private removeUblExtensions(xml: string): string {
    return xml.replace(/<ext:UBLExtensions>[\s\S]*?<\/ext:UBLExtensions>/, '');
  }

  private pemToDer(pem: string): Buffer {
    const base64 = pem
      .replace(/-----BEGIN [A-Z ]+-----/g, '')
      .replace(/-----END [A-Z ]+-----/g, '')
      .replace(/\s/g, '');
    return Buffer.from(base64, 'base64');
  }

  private buildSignatureXml(
    digestValue: string,
    signatureValue: string,
    certificatePem: string,
    certDigest: string,
  ): string {
    const certBase64 = certificatePem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');

    return `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ds:SignedInfo>
    <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
    <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/>
    <ds:Reference Id="invoiceSignedData" URI="">
      <ds:Transforms>
        <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
          <ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath>
        </ds:Transform>
      </ds:Transforms>
      <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
      <ds:DigestValue>${digestValue}</ds:DigestValue>
    </ds:Reference>
    <ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties">
      <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
      <ds:DigestValue>${certDigest}</ds:DigestValue>
    </ds:Reference>
  </ds:SignedInfo>
  <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
  <ds:KeyInfo>
    <ds:X509Data>
      <ds:X509Certificate>${certBase64}</ds:X509Certificate>
    </ds:X509Data>
  </ds:KeyInfo>
  <ds:Object>
    <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="signature">
      <xades:SignedProperties Id="xadesSignedProperties">
        <xades:SignedSignatureProperties>
          <xades:SigningTime>${new Date().toISOString()}</xades:SigningTime>
          <xades:SigningCertificate>
            <xades:Cert>
              <xades:CertDigest>
                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                <ds:DigestValue>${certDigest}</ds:DigestValue>
              </xades:CertDigest>
            </xades:Cert>
          </xades:SigningCertificate>
        </xades:SignedSignatureProperties>
      </xades:SignedProperties>
    </xades:QualifyingProperties>
  </ds:Object>
</ds:Signature>`;
  }

  private insertSignature(xml: string, signatureXml: string): string {
    return xml.replace(
      /<ext:ExtensionContent\/>/,
      `<ext:ExtensionContent>${signatureXml}</ext:ExtensionContent>`,
    );
  }
}
