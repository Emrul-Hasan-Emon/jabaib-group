import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restrict a route to the given AdminUser roles, e.g. @Roles('super_admin'). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
