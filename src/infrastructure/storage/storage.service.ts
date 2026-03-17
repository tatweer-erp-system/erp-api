import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null;
  private readonly bucket: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('storage.enabled') ?? false;

    if (!this.enabled) {
      this.logger.warn('Storage disabled via STORAGE_ENABLED flag');
      this.s3 = null;
      this.bucket = '';
      return;
    }

    const aws = this.configService.get('storage.aws');
    this.bucket = aws.bucket;
    this.s3 = new S3Client({
      region: aws.region,
      credentials: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
      },
    });
  }

  private assertEnabled(): void {
    if (!this.enabled || !this.s3) {
      throw new ServiceUnavailableException('Storage is disabled. Enable via STORAGE_ENABLED=true');
    }
  }

  async upload(
    buffer: Buffer,
    mimeType: string,
    folder: string,
    filename?: string,
  ): Promise<string> {
    this.assertEnabled();
    const key = `${folder}/${filename ?? uuidv7()}`;
    await this.s3!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return key;
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    this.assertEnabled();
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3!, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    this.assertEnabled();
    await this.s3!.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  getPublicUrl(key: string): string {
    this.assertEnabled();
    const region = this.configService.get<string>('storage.aws.region');
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
