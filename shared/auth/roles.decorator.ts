/**
 * Roles decorator - required roles for endpoint (OR logic by default).
 * Use with RolesGuard after JwtAuthGuard. Roles from auth-microservice RBAC.
 */

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export interface RolesOptions {
  requireAll?: boolean;
}

export const Roles = (
  ...roles: (string | RolesOptions)[]
): ReturnType<typeof SetMetadata> => {
  const lastArg = roles[roles.length - 1];
  const options: RolesOptions =
    typeof lastArg === 'object' && !Array.isArray(lastArg) && 'requireAll' in lastArg
      ? (lastArg as RolesOptions)
      : { requireAll: false };
  const roleStrings = roles.filter((r) => typeof r === 'string') as string[];
  return SetMetadata(ROLES_KEY, { roles: roleStrings, ...options });
};
