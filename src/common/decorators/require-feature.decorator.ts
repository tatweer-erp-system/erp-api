import { SetMetadata } from '@nestjs/common';

export const REQUIRE_FEATURE_KEY = 'requireFeature';

/**
 * Marks a controller or route requiring a specific tenant feature to be enabled.
 * FeatureFlagGuard checks tenant.features[feature] before allowing access.
 *
 * @example @RequireFeature('chat')
 */
export const RequireFeature = (feature: string) => SetMetadata(REQUIRE_FEATURE_KEY, feature);
