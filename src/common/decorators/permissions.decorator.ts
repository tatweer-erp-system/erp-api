import { SetMetadata } from '@nestjs/common';
import { PermissionString } from '../types/permission.types';

export const PERMISSIONS_KEY = 'permissions';

export const Permissions = (...permissions: PermissionString[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
