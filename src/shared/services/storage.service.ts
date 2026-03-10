import { Injectable } from '@nestjs/common';
import { StorageService as InfraStorageService } from '@/infrastructure/storage/storage.service';

@Injectable()
export class SharedStorageService {
  constructor(private readonly storage: InfraStorageService) {}

  async upload(
    buffer: Buffer,
    mimeType: string,
    folder: string,
    filename?: string,
  ): Promise<string> {
    return this.storage.upload(buffer, mimeType, folder, filename);
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return this.storage.getSignedUrl(key, expiresInSeconds);
  }

  async delete(key: string): Promise<void> {
    return this.storage.delete(key);
  }

  getPublicUrl(key: string): string {
    return this.storage.getPublicUrl(key);
  }
}
