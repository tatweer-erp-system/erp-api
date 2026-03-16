import { Injectable, NotFoundException } from '@nestjs/common';
import {
  JobTitlesRepository,
  EmploymentTypesRepository,
  LeaveTypesConfigRepository,
  PublicHolidaysRepository,
  TerminationReasonsRepository,
} from '@/database/sql/repositories';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { CreateJobTitleDto } from '../dto/create-job-title.dto';
import { UpdateJobTitleDto } from '../dto/update-job-title.dto';
import { CreateEmploymentTypeConfigDto } from '../dto/create-employment-type-config.dto';
import { UpdateEmploymentTypeConfigDto } from '../dto/update-employment-type-config.dto';
import { CreateLeaveTypeConfigDto } from '../dto/create-leave-type-config.dto';
import { UpdateLeaveTypeConfigDto } from '../dto/update-leave-type-config.dto';
import { CreatePublicHolidayDto } from '../dto/create-public-holiday.dto';
import { UpdatePublicHolidayDto } from '../dto/update-public-holiday.dto';
import { CreateTerminationReasonDto } from '../dto/create-termination-reason.dto';
import { UpdateTerminationReasonDto } from '../dto/update-termination-reason.dto';

@Injectable()
export class HrDefinitionsService {
  constructor(
    private readonly jobTitlesRepository: JobTitlesRepository,
    private readonly employmentTypesRepository: EmploymentTypesRepository,
    private readonly leaveTypesConfigRepository: LeaveTypesConfigRepository,
    private readonly publicHolidaysRepository: PublicHolidaysRepository,
    private readonly terminationReasonsRepository: TerminationReasonsRepository,
  ) {}

  // ── Job Titles ──────────────────────────────────────────────────────────────

  async findAllJobTitles(tenantId: string, query: PaginationDto) {
    return this.jobTitlesRepository.findAll({ ...query, tenantId });
  }

  async findJobTitleById(tenantId: string, id: string) {
    return this.jobTitlesRepository.findById(id, { tenantId });
  }

  async createJobTitle(tenantId: string, dto: CreateJobTitleDto, auditContext: AuditContext) {
    return this.jobTitlesRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  async updateJobTitle(
    tenantId: string,
    id: string,
    dto: UpdateJobTitleDto,
    auditContext: AuditContext,
  ) {
    return this.jobTitlesRepository.update(id, { ...dto } as any, { tenantId, auditContext });
  }

  async deleteJobTitle(tenantId: string, id: string, auditContext: AuditContext) {
    return this.jobTitlesRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Employment Types ────────────────────────────────────────────────────────

  async findAllEmploymentTypes(tenantId: string, query: PaginationDto) {
    return this.employmentTypesRepository.findAll({ ...query, tenantId });
  }

  async findEmploymentTypeById(tenantId: string, id: string) {
    return this.employmentTypesRepository.findById(id, { tenantId });
  }

  async createEmploymentType(
    tenantId: string,
    dto: CreateEmploymentTypeConfigDto,
    auditContext: AuditContext,
  ) {
    return this.employmentTypesRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  async updateEmploymentType(
    tenantId: string,
    id: string,
    dto: UpdateEmploymentTypeConfigDto,
    auditContext: AuditContext,
  ) {
    return this.employmentTypesRepository.update(id, { ...dto } as any, { tenantId, auditContext });
  }

  async deleteEmploymentType(tenantId: string, id: string, auditContext: AuditContext) {
    return this.employmentTypesRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Leave Types Config ──────────────────────────────────────────────────────

  async findAllLeaveTypes(tenantId: string, query: PaginationDto) {
    return this.leaveTypesConfigRepository.findAll({ ...query, tenantId });
  }

  async findLeaveTypeById(tenantId: string, id: string) {
    return this.leaveTypesConfigRepository.findById(id, { tenantId });
  }

  async createLeaveType(
    tenantId: string,
    dto: CreateLeaveTypeConfigDto,
    auditContext: AuditContext,
  ) {
    return this.leaveTypesConfigRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  async updateLeaveType(
    tenantId: string,
    id: string,
    dto: UpdateLeaveTypeConfigDto,
    auditContext: AuditContext,
  ) {
    return this.leaveTypesConfigRepository.update(id, { ...dto } as any, {
      tenantId,
      auditContext,
    });
  }

  async deleteLeaveType(tenantId: string, id: string, auditContext: AuditContext) {
    return this.leaveTypesConfigRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Public Holidays ─────────────────────────────────────────────────────────

  async findAllPublicHolidays(tenantId: string, query: PaginationDto) {
    return this.publicHolidaysRepository.findAll({ ...query, tenantId });
  }

  async findPublicHolidayById(tenantId: string, id: string) {
    return this.publicHolidaysRepository.findById(id, { tenantId });
  }

  async createPublicHoliday(
    tenantId: string,
    dto: CreatePublicHolidayDto,
    auditContext: AuditContext,
  ) {
    return this.publicHolidaysRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  async updatePublicHoliday(
    tenantId: string,
    id: string,
    dto: UpdatePublicHolidayDto,
    auditContext: AuditContext,
  ) {
    return this.publicHolidaysRepository.update(id, { ...dto } as any, { tenantId, auditContext });
  }

  async deletePublicHoliday(tenantId: string, id: string, auditContext: AuditContext) {
    return this.publicHolidaysRepository.softDelete(id, { tenantId, auditContext });
  }

  // ── Termination Reasons ─────────────────────────────────────────────────────

  async findAllTerminationReasons(tenantId: string, query: PaginationDto) {
    return this.terminationReasonsRepository.findAll({ ...query, tenantId });
  }

  async findTerminationReasonById(tenantId: string, id: string) {
    return this.terminationReasonsRepository.findById(id, { tenantId });
  }

  async createTerminationReason(
    tenantId: string,
    dto: CreateTerminationReasonDto,
    auditContext: AuditContext,
  ) {
    return this.terminationReasonsRepository.create({ ...dto } as any, { tenantId, auditContext });
  }

  async updateTerminationReason(
    tenantId: string,
    id: string,
    dto: UpdateTerminationReasonDto,
    auditContext: AuditContext,
  ) {
    return this.terminationReasonsRepository.update(id, { ...dto } as any, {
      tenantId,
      auditContext,
    });
  }

  async deleteTerminationReason(tenantId: string, id: string, auditContext: AuditContext) {
    return this.terminationReasonsRepository.softDelete(id, { tenantId, auditContext });
  }
}
