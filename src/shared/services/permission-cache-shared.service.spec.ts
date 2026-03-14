jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-v4'),
  v7: jest.fn().mockReturnValue('mock-uuid-v7'),
}));

import { PermissionCacheSharedService } from './permission-cache-shared.service';

describe('PermissionCacheSharedService', () => {
  let service: PermissionCacheSharedService;
  let cacheService: Record<string, jest.Mock>;
  let rolesRepository: Record<string, jest.Mock>;

  const tenantId = 'tenant-001';

  beforeEach(() => {
    cacheService = {
      permissionKey: jest.fn().mockImplementation((tid, uid) => `perm:${tid}:${uid}`),
      del: jest.fn().mockResolvedValue(undefined),
    };

    rolesRepository = {
      findUserIdsByRoleId: jest.fn().mockResolvedValue([]),
    };

    service = new PermissionCacheSharedService(cacheService as any, rolesRepository as any);
  });

  describe('invalidateUserPermissions()', () => {
    it('should delete cache for specific user', async () => {
      const userId = 'user-001';

      await service.invalidateUserPermissions(tenantId, userId);

      expect(cacheService.permissionKey).toHaveBeenCalledWith(tenantId, userId);
      expect(cacheService.del).toHaveBeenCalledWith(`perm:${tenantId}:${userId}`);
    });
  });

  describe('invalidateRolePermissions()', () => {
    it('should look up all users with that role and invalidate cache for each', async () => {
      const roleId = 'role-001';
      const userIds = ['user-001', 'user-002', 'user-003'];
      rolesRepository.findUserIdsByRoleId.mockResolvedValue(userIds);

      await service.invalidateRolePermissions(tenantId, roleId);

      expect(rolesRepository.findUserIdsByRoleId).toHaveBeenCalledWith(tenantId, roleId);
      expect(cacheService.del).toHaveBeenCalledTimes(3);
      expect(cacheService.del).toHaveBeenCalledWith(`perm:${tenantId}:user-001`);
      expect(cacheService.del).toHaveBeenCalledWith(`perm:${tenantId}:user-002`);
      expect(cacheService.del).toHaveBeenCalledWith(`perm:${tenantId}:user-003`);
    });

    it('should not call del when no users have the role', async () => {
      rolesRepository.findUserIdsByRoleId.mockResolvedValue([]);

      await service.invalidateRolePermissions(tenantId, 'role-empty');

      expect(rolesRepository.findUserIdsByRoleId).toHaveBeenCalledWith(tenantId, 'role-empty');
      expect(cacheService.del).not.toHaveBeenCalled();
    });
  });
});
