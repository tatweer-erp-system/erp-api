/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProjectStatus, ProjectMemberRole } from '@/common/enums/project.enums';

// Mock all repository/service imports to prevent entity imports (which pull in uuid ESM)
jest.mock('@/database/sql/repositories/projects.repository', () => ({
  ProjectsRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/project-members.repository', () => ({
  ProjectMembersRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/tasks.repository', () => ({
  TasksRepository: jest.fn(),
}));
jest.mock('@/shared/services/audit-shared.service', () => ({
  AuditSharedService: jest.fn(),
}));
jest.mock('@/shared/services/status-transition-shared.service', () => ({
  StatusTransitionSharedService: jest.fn(),
}));

import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: Record<string, jest.Mock>;
  let projectMembersRepository: Record<string, jest.Mock>;
  let tasksRepository: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;
  let statusTransitionService: Record<string, jest.Mock>;

  const tenantId = 'tenant-1';
  const projectId = 'project-1';
  const userId = 'user-1';
  const auditContext = { userId };

  const mockProject = {
    id: projectId,
    nameEn: 'Test Project',
    nameAr: 'مشروع تجريبي',
    descriptionEn: 'Description',
    descriptionAr: 'وصف',
    status: ProjectStatus.PLANNING,
    version: 1,
    startDate: null,
    endDate: null,
    budget: null,
    managerId: null,
    createdBy: userId,
  };

  beforeEach(() => {
    projectsRepository = {
      findOneById: jest.fn(),
      insertProject: jest.fn(),
      updateProject: jest.fn(),
      softDeleteProject: jest.fn(),
      findAllPaginated: jest.fn(),
      findDropdown: jest.fn(),
    };

    projectMembersRepository = {
      findByProject: jest.fn(),
      findOne: jest.fn(),
      insert: jest.fn(),
      updateRole: jest.fn(),
      remove: jest.fn(),
      countByRole: jest.fn(),
      findAssignableUsers: jest.fn(),
    };

    tasksRepository = {
      countActiveByProject: jest.fn(),
      countByProject: jest.fn(),
      countCompletedByProject: jest.fn(),
      countByStatusForProject: jest.fn(),
      getHoursSummaryForProject: jest.fn(),
      countOverdueByProject: jest.fn(),
    };

    auditService = {
      logCreate: jest.fn(),
      logUpdate: jest.fn(),
      logDelete: jest.fn(),
      logStatusChange: jest.fn(),
    };

    statusTransitionService = {
      validateOrThrow: jest.fn(),
    };

    service = new ProjectsService(
      projectsRepository as any,
      projectMembersRepository as any,
      tasksRepository as any,
      auditService as any,
      statusTransitionService as any,
    );
  });

  describe('create()', () => {
    it('should create a project with correct data and call auditService.logCreate', async () => {
      const dto = {
        nameEn: 'New Project',
        nameAr: 'مشروع جديد',
        descriptionEn: 'Desc',
        descriptionAr: 'وصف',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        budget: 50000,
        managerId: 'manager-1',
      };

      projectsRepository.insertProject.mockResolvedValue(projectId);
      projectsRepository.findOneById.mockResolvedValue({ ...mockProject, ...dto, id: projectId });

      const result = await service.create(tenantId, dto as any, auditContext);

      expect(projectsRepository.insertProject).toHaveBeenCalledWith(tenantId, {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr,
        status: ProjectStatus.PLANNING,
        startDate: dto.startDate,
        endDate: dto.endDate,
        budget: dto.budget,
        managerId: dto.managerId,
        createdBy: userId,
      });
      expect(auditService.logCreate).toHaveBeenCalledWith(
        tenantId,
        'projects',
        projectId,
        expect.any(Object),
        userId,
      );
      expect(result!.nameEn).toBe(dto.nameEn);
    });
  });

  describe('update()', () => {
    it('should update a project successfully', async () => {
      const dto = { nameEn: 'Updated', version: 1 };
      const updatedProject = { ...mockProject, nameEn: 'Updated', version: 2 };

      projectsRepository.findOneById
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(updatedProject);
      projectsRepository.updateProject.mockResolvedValue(undefined);

      const result = await service.update(tenantId, projectId, dto as any, auditContext);

      expect(projectsRepository.updateProject).toHaveBeenCalled();
      expect(auditService.logUpdate).toHaveBeenCalled();
      expect(result!.nameEn).toBe('Updated');
    });

    it('should throw ConflictException on version mismatch', async () => {
      const dto = { nameEn: 'Updated', version: 0 };
      projectsRepository.findOneById.mockResolvedValue(mockProject); // version is 1

      await expect(service.update(tenantId, projectId, dto as any, auditContext)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      projectsRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.update(tenantId, projectId, { nameEn: 'X', version: 1 } as any, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('should throw BadRequestException when project has active tasks', async () => {
      projectsRepository.findOneById.mockResolvedValue(mockProject);
      tasksRepository.countActiveByProject.mockResolvedValue(3);

      await expect(service.remove(tenantId, projectId, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should soft delete when no active tasks', async () => {
      projectsRepository.findOneById.mockResolvedValue(mockProject);
      tasksRepository.countActiveByProject.mockResolvedValue(0);

      await service.remove(tenantId, projectId, auditContext);

      expect(projectsRepository.softDeleteProject).toHaveBeenCalledWith(
        tenantId,
        projectId,
        userId,
      );
      expect(auditService.logDelete).toHaveBeenCalledWith(
        tenantId,
        'projects',
        projectId,
        mockProject,
        userId,
      );
    });
  });

  describe('complete()', () => {
    it('should throw BadRequestException when tasks are still active', async () => {
      const activeProject = { ...mockProject, status: ProjectStatus.ACTIVE };
      projectsRepository.findOneById.mockResolvedValue(activeProject);
      tasksRepository.countActiveByProject.mockResolvedValue(2);

      await expect(service.complete(tenantId, projectId, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should succeed when all tasks are done/cancelled', async () => {
      const activeProject = { ...mockProject, status: ProjectStatus.ACTIVE };
      projectsRepository.findOneById
        .mockResolvedValueOnce(activeProject)
        .mockResolvedValueOnce({ ...activeProject, status: ProjectStatus.COMPLETED });
      tasksRepository.countActiveByProject.mockResolvedValue(0);
      statusTransitionService.validateOrThrow.mockReturnValue(undefined);
      projectsRepository.updateProject.mockResolvedValue(undefined);

      const result = await service.complete(tenantId, projectId, auditContext);

      expect(statusTransitionService.validateOrThrow).toHaveBeenCalledWith(
        'project',
        ProjectStatus.ACTIVE,
        ProjectStatus.COMPLETED,
      );
      expect(auditService.logStatusChange).toHaveBeenCalledWith(
        tenantId,
        'projects',
        projectId,
        ProjectStatus.ACTIVE,
        ProjectStatus.COMPLETED,
        userId,
      );
      expect(result!.status).toBe(ProjectStatus.COMPLETED);
    });
  });

  describe('addMember()', () => {
    it('should throw ConflictException when user is already a member', async () => {
      projectsRepository.findOneById.mockResolvedValue(mockProject);
      projectMembersRepository.findOne.mockResolvedValue({ userId, role: 'developer' });

      await expect(
        service.addMember(projectId, tenantId, userId, 'developer', auditContext),
      ).rejects.toThrow(ConflictException);
    });

    it('should add a member successfully when not already a member', async () => {
      const newMember = { projectId, userId: 'user-2', role: 'developer' };
      projectsRepository.findOneById.mockResolvedValue(mockProject);
      projectMembersRepository.findOne.mockResolvedValue(null);
      projectMembersRepository.insert.mockResolvedValue(newMember);

      const result = await service.addMember(
        projectId,
        tenantId,
        'user-2',
        'developer',
        auditContext,
      );

      expect(result).toEqual(newMember);
      expect(auditService.logCreate).toHaveBeenCalled();
    });
  });

  describe('removeMember()', () => {
    it('should throw BadRequestException when removing last manager', async () => {
      projectsRepository.findOneById.mockResolvedValue(mockProject);
      projectMembersRepository.findOne.mockResolvedValue({
        userId,
        role: ProjectMemberRole.MANAGER,
      });
      projectMembersRepository.countByRole.mockResolvedValue(1);

      await expect(service.removeMember(projectId, userId, tenantId, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should remove a member successfully when not last manager', async () => {
      projectsRepository.findOneById.mockResolvedValue(mockProject);
      projectMembersRepository.findOne.mockResolvedValue({
        userId,
        role: ProjectMemberRole.DEVELOPER,
      });

      await service.removeMember(projectId, userId, tenantId, auditContext);

      expect(projectMembersRepository.remove).toHaveBeenCalledWith(tenantId, projectId, userId);
      expect(auditService.logDelete).toHaveBeenCalled();
    });
  });

  describe('findById()', () => {
    it('should return project when found', async () => {
      projectsRepository.findOneById.mockResolvedValue(mockProject);

      const result = await service.findById(tenantId, projectId);

      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when not found', async () => {
      projectsRepository.findOneById.mockResolvedValue(null);

      await expect(service.findById(tenantId, projectId)).rejects.toThrow(NotFoundException);
    });
  });
});
