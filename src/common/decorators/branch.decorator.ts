import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the validated branch ID from the request.
 * Set by BranchGuard after validating user access to the branch.
 * Falls back to x-branch-id header if guard hasn't run.
 *
 * Usage: @BranchId() branchId: string | undefined
 */
export const BranchId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.branchId ?? request.headers['x-branch-id'];
  },
);
