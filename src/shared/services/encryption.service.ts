import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer | null;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>('encryption.fieldKey');
    if (keyHex && keyHex.length === 64) {
      this.key = Buffer.from(keyHex, 'hex');
    } else {
      this.key = null;
      this.logger.warn('FIELD_ENCRYPTION_KEY not configured or invalid. Encryption disabled.');
    }
  }

  encrypt(plaintext: string): string {
    if (!this.key) return plaintext;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    if (!this.key) return ciphertext;

    try {
      const buffer = Buffer.from(ciphertext, 'base64');
      const iv = buffer.subarray(0, IV_LENGTH);
      const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      return decipher.update(encrypted) + decipher.final('utf8');
    } catch {
      this.logger.error('Decryption failed — returning masked value');
      return '***ENCRYPTED***';
    }
  }

  isConfigured(): boolean {
    return this.key !== null;
  }

  mask(value: string, visibleChars = 4): string {
    if (value.length <= visibleChars) return '****';
    return '*'.repeat(value.length - visibleChars) + value.slice(-visibleChars);
  }
}
