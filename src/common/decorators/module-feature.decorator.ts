import { SetMetadata } from '@nestjs/common';

export const MODULE_FEATURE_KEY = 'moduleFeature';

/**
 * Marks a controller or route handler with the ERP module name it belongs to.
 * SubscriptionGuard uses this to check if the tenant's plan includes the module.
 *
 * @example @ModuleFeature('crm')
 */
export const ModuleFeature = (module: string) => SetMetadata(MODULE_FEATURE_KEY, module);
