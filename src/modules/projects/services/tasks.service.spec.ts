/* eslint-disable @typescript-eslint/no-unused-vars */
import { TaskStatus, TaskPriority } from '@/common/enums/project.enums';

// Mock all repository/service imports to prevent entity imports (which pull in uuid ESM)
jest.mock('@/database/sql/repositories/tasks.repository', () => ({
  TasksRepository: jest.fn(),
}));
jest.mock('@/database/sql/repositories/task-time-entries.repository', () => ({
  TaskTimeEntriesRepository: jest.fn(),
}));
jest.mock('@/shared/services/audit-shared.service', () => ({
  AuditSharedService: jest.fn(),
}));
jest.mock('@/shared/services/status-transition-shared.service', () => ({
  StatusTransitionSharedService: jest.fn(),
}));
jest.mock('@/shared/services/notification-shared.service', () => ({
  NotificationSharedService: jest.fn(),
}));

import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepository: Record<string, jest.Mock>;
  let taskTimeEntriesRepository: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;
  let statusTransitionService: Record<string, jest.Mock>;
  let notificationService: Record<string, jest.Mock>;

  const tenantId = 'tenant-1';
  const taskId = 'task-1';
  const projectId = 'project-1';
  const userId = 'user-1';
  const auditContext = { userId };

  const mockTask = {
    id: taskId,
    projectId,
    titleEn: 'Test Task',
    titleAr: 'مهمة تجريبية',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assignedTo: null,
    dueDate: null,
    estimatedHours: 0,
    loggedHours: 0,
    version: 1,
    toJSON() {
      return {
        id: taskId,
        projectId,
        titleEn: 'Test Task',
        titleAr: 'مهمة تجريبية',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
      };
    },
  };

  beforeEach(() => {
    tasksRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      atomicIncrementLoggedHours: jest.fn(),
      findOverdue: jest.fn(),
    };

    taskTimeEntriesRepository = {
      create: jest.fn(),
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

    notificationService = {
      sendInApp: jest.fn(),
    };

    service = new TasksService(
      tasksRepository as any,
      taskTimeEntriesRepository as any,
      auditService as any,
      statusTransitionService as any,
      notificationService as any,
    );
  });

  describe('logTime()', () => {
    it('should call atomicIncrementLoggedHours and create a time entry', async () => {
      const dto = { hours: 2.5, description: 'Worked on feature', date: '2026-03-14' };
      const timeEntry = { id: 'entry-1', taskId, hours: 2.5 };

      tasksRepository.findById.mockResolvedValue(mockTask);
      tasksRepository.atomicIncrementLoggedHours.mockResolvedValue(undefined);
      taskTimeEntriesRepository.create.mockResolvedValue(timeEntry);

      const result = await service.logTime(tenantId, taskId, dto as any, auditContext);

      expect(tasksRepository.findById).toHaveBeenCalledWith(taskId, { tenantId });
      expect(tasksRepository.atomicIncrementLoggedHours).toHaveBeenCalledWith(
        tenantId,
        taskId,
        2.5,
      );
      expect(taskTimeEntriesRepository.create).toHaveBeenCalledWith(
        {
          taskId,
          userId,
          hours: 2.5,
          description: 'Worked on feature',
          entryDate: '2026-03-14',
        },
        { auditContext, tenantId },
      );
      expect(result).toEqual(timeEntry);
    });

    it('should throw when task is not found', async () => {
      tasksRepository.findById.mockRejectedValue(new Error('Not found'));

      await expect(
        service.logTime(
          tenantId,
          'nonexistent',
          { hours: 1, date: '2026-01-01' } as any,
          auditContext,
        ),
      ).rejects.toThrow();
    });
  });

  describe('getOverdueTasks()', () => {
    it('should return overdue tasks from the repository', async () => {
      const overdueTasks = [
        { id: 'task-1', dueDate: '2026-01-01', status: TaskStatus.TODO },
        { id: 'task-2', dueDate: '2026-02-01', status: TaskStatus.IN_PROGRESS },
      ];
      tasksRepository.findOverdue.mockResolvedValue(overdueTasks);

      const result = await service.getOverdueTasks(tenantId, projectId);

      expect(tasksRepository.findOverdue).toHaveBeenCalledWith(tenantId, projectId);
      expect(result).toEqual(overdueTasks);
      expect(result).toHaveLength(2);
    });
  });

  describe('create()', () => {
    it('should create a task with correct defaults', async () => {
      const dto = {
        projectId,
        titleEn: 'New Task',
        titleAr: 'مهمة جديدة',
      };

      const createdTask = {
        ...mockTask,
        ...dto,
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        toJSON() {
          return { ...dto, status: TaskStatus.TODO };
        },
      };

      tasksRepository.create.mockResolvedValue(createdTask);

      const result = await service.create(tenantId, dto as any, auditContext);

      expect(tasksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          titleEn: 'New Task',
          titleAr: 'مهمة جديدة',
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          assignedTo: null,
          dueDate: null,
          estimatedHours: 0,
          parentTaskId: null,
          descriptionEn: null,
          descriptionAr: null,
        }),
        { auditContext, tenantId },
      );
      expect(auditService.logCreate).toHaveBeenCalled();
      expect(result).toEqual(createdTask);
    });

    it('should use provided priority instead of default', async () => {
      const dto = {
        projectId,
        titleEn: 'Urgent Task',
        titleAr: 'مهمة عاجلة',
        priority: TaskPriority.CRITICAL,
        assigneeId: 'assignee-1',
      };

      const createdTask = {
        ...mockTask,
        id: 'task-new',
        priority: TaskPriority.CRITICAL,
        assignedTo: 'assignee-1',
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        toJSON() {
          return { ...dto };
        },
      };

      tasksRepository.create.mockResolvedValue(createdTask);

      await service.create(tenantId, dto as any, auditContext);

      expect(tasksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: TaskPriority.CRITICAL,
          assignedTo: 'assignee-1',
        }),
        expect.any(Object),
      );
      expect(notificationService.sendInApp).toHaveBeenCalledWith(
        tenantId,
        'assignee-1',
        'task:assigned',
        expect.any(Object),
      );
    });
  });

  describe('update()', () => {
    it('should update a task and log audit', async () => {
      const dto = { titleEn: 'Updated Task' };
      const updatedTask = {
        ...mockTask,
        titleEn: 'Updated Task',
        toJSON() {
          return { titleEn: 'Updated Task' };
        },
      };

      tasksRepository.findById.mockResolvedValue(mockTask);
      tasksRepository.update.mockResolvedValue(updatedTask);

      const result = await service.update(tenantId, taskId, dto as any, auditContext);

      expect(tasksRepository.update).toHaveBeenCalledWith(
        taskId,
        { titleEn: 'Updated Task' },
        { auditContext, tenantId },
      );
      expect(auditService.logUpdate).toHaveBeenCalled();
      expect(result.titleEn).toBe('Updated Task');
    });
  });
});
