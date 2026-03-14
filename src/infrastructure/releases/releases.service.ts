import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ReleasesRepository } from '@/database/sql/repositories/releases.repository';
import { Release } from './entities/release.entity';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { msg } from '@/common/i18n/error.helper';
import { ErrorMessages } from '@/common/i18n/errors.i18n';

const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

@Injectable()
export class ReleasesService {
  constructor(private readonly releasesRepository: ReleasesRepository) {}

  // ── Public ────────────────────────────────────────────────────────────────

  async listPublished(): Promise<Release[]> {
    return this.releasesRepository.findAllRaw({
      where: { isPublished: true },
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
  }

  async findByVersion(version: string): Promise<Release> {
    const release = await this.releasesRepository.findOne({
      where: { version, isPublished: true },
    });
    if (!release) {
      throw new NotFoundException(msg(ErrorMessages.RELEASE_NOT_FOUND, version));
    }
    return release;
  }

  async getLatest(): Promise<Release | null> {
    return this.releasesRepository.findOne({
      where: { isPublished: true },
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async listAll(): Promise<Release[]> {
    return this.releasesRepository.findAllRaw({
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
  }

  async findById(id: string): Promise<Release> {
    const release = await this.releasesRepository.findByIdOrNull(id);
    if (!release) {
      throw new NotFoundException(msg(ErrorMessages.RELEASE_NOT_FOUND, id));
    }
    return release;
  }

  async create(dto: CreateReleaseDto, auditContext?: AuditContext): Promise<Release> {
    if (!VERSION_REGEX.test(dto.version)) {
      throw new BadRequestException(msg(ErrorMessages.RELEASE_INVALID_VERSION, dto.version));
    }

    const existing = await this.releasesRepository.findOne({
      where: { version: dto.version },
    });
    if (existing) {
      throw new ConflictException(msg(ErrorMessages.RELEASE_VERSION_EXISTS, dto.version));
    }

    return this.releasesRepository.create(
      {
        version: dto.version,
        date: new Date().toISOString().split('T')[0],
        type: dto.type,
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        descriptionEn: dto.descriptionEn ?? '',
        descriptionAr: dto.descriptionAr ?? '',
        changes: dto.changes ?? [],
        tour: dto.tour ?? null,
        isPublished: false,
      } as any,
      { auditContext },
    );
  }

  async update(id: string, dto: UpdateReleaseDto, auditContext?: AuditContext): Promise<Release> {
    const release = await this.releasesRepository.findByIdOrNull(id);
    if (!release) {
      throw new NotFoundException(msg(ErrorMessages.RELEASE_NOT_FOUND, id));
    }

    if (dto.version !== undefined) {
      if (!VERSION_REGEX.test(dto.version)) {
        throw new BadRequestException(msg(ErrorMessages.RELEASE_INVALID_VERSION, dto.version));
      }

      if (dto.version !== release.version) {
        const dup = await this.releasesRepository.findOne({
          where: { version: dto.version },
        });
        if (dup) {
          throw new ConflictException(msg(ErrorMessages.RELEASE_VERSION_EXISTS, dto.version));
        }
      }
    }

    return this.releasesRepository.update(id, { ...dto } as any, { auditContext });
  }

  async publish(id: string, auditContext?: AuditContext): Promise<Release> {
    const release = await this.releasesRepository.findByIdOrNull(id);
    if (!release) {
      throw new NotFoundException(msg(ErrorMessages.RELEASE_NOT_FOUND, id));
    }

    const updateData: Record<string, unknown> = { isPublished: true };
    if (!release.date) {
      updateData.date = new Date().toISOString().split('T')[0];
    }

    return this.releasesRepository.update(id, updateData as any, { auditContext });
  }

  async unpublish(id: string, auditContext?: AuditContext): Promise<Release> {
    const release = await this.releasesRepository.findByIdOrNull(id);
    if (!release) {
      throw new NotFoundException(msg(ErrorMessages.RELEASE_NOT_FOUND, id));
    }

    return this.releasesRepository.update(id, { isPublished: false } as any, { auditContext });
  }

  async delete(id: string, auditContext?: AuditContext): Promise<void> {
    const release = await this.releasesRepository.findByIdOrNull(id);
    if (!release) {
      throw new NotFoundException(msg(ErrorMessages.RELEASE_NOT_FOUND, id));
    }

    await this.releasesRepository.softDelete(id, { auditContext });
  }
}
