import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { JwtPayload } from '../jwt/jwt-payload';

const handler = () => undefined;
const clazz = class AdminController {};

function buildContext(user?: Partial<JwtPayload>) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
    getClass: () => clazz,
  } as never;
}

describe('RolesGuard (permission checks)', () => {
  let guard: RolesGuard;

  const setRoles = (roles: string[]) =>
    Reflect.defineMetadata(ROLES_KEY, roles, handler);
  const setIsPublic = (value: boolean) => {
    Reflect.defineMetadata(IS_PUBLIC_KEY, value, handler);
    Reflect.defineMetadata(IS_PUBLIC_KEY, value, clazz);
  };

  const superAdmin: JwtPayload = {
    id: 1,
    sub: 'root@jabaib.test',
    type: 'admin',
    role: 'super_admin',
    userName: 'Root User',
  };
  const admin: JwtPayload = {
    id: 2,
    sub: 'admin@jabaib.test',
    type: 'admin',
    role: 'admin',
    userName: 'Admin User',
  };
  const editor: JwtPayload = {
    id: 3,
    sub: 'editor@jabaib.test',
    type: 'admin',
    role: 'editor',
    userName: 'Editor User',
  };
  // A logged-in customer must never satisfy admin role checks, even if the
  // token carries a role claim — the guard keys on user.type === 'admin'.
  const customer: JwtPayload = {
    id: 4,
    sub: 'customer@jabaib.test',
    type: 'user',
    role: 'user',
    userName: 'Customer',
  };

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
    setIsPublic(false);
    Reflect.defineMetadata(ROLES_KEY, undefined, handler);
    Reflect.defineMetadata(ROLES_KEY, undefined, clazz);
  });

  it('lets public routes through with no user attached', () => {
    setIsPublic(true);
    expect(guard.canActivate(buildContext(undefined))).toBe(true);
  });

  it('lets routes with no role metadata through', () => {
    expect(guard.canActivate(buildContext(superAdmin))).toBe(true);
  });

  it('rejects protected routes with no authenticated user (401)', () => {
    setRoles(['super_admin']);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('lets a super_admin into super_admin-only endpoints', () => {
    setRoles(['super_admin']);
    expect(guard.canActivate(buildContext(superAdmin))).toBe(true);
  });

  // Phase 7 step 4: non-privileged admin roles (the "manager" tier in this
  // single-store operator model) must be locked out of super_admin endpoints.
  it.each([
    ['admin', admin],
    ['editor', editor],
    ['customer user', customer],
  ])('rejects %s from super_admin-only endpoints (403)', (_label, actor) => {
    setRoles(['super_admin']);
    expect(() => guard.canActivate(buildContext(actor))).toThrow(
      ForbiddenException,
    );
  });

  it('lets admin/editor into the shared catalog/admin tier', () => {
    setRoles(['admin', 'editor']);
    expect(guard.canActivate(buildContext(admin))).toBe(true);
    expect(guard.canActivate(buildContext(editor))).toBe(true);
  });

  it('still locks a customer out of the catalog tier (403)', () => {
    setRoles(['admin', 'editor']);
    expect(() => guard.canActivate(buildContext(customer))).toThrow(
      ForbiddenException,
    );
  });
});
