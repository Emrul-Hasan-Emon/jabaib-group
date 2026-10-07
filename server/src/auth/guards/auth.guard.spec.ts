import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * The guard must reject protected routes without a token, and — for public
 * routes — attach the user when a valid token happens to be present so handlers
 * can distinguish a guest from a signed-in customer (guest cart, coupon limits).
 */
describe('AuthGuard', () => {
  const payload = {
    sub: 'u@test.dev',
    id: 7,
    type: 'user' as const,
    role: null,
    userName: 'Rafi',
  };

  function makeContext(options: { isPublic: boolean; token?: string }) {
    const request: any = { headers: {} };
    if (options.token)
      request.headers.authorization = `Bearer ${options.token}`;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    } as unknown as ExecutionContext;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(options.isPublic),
    } as unknown as Reflector;
    return { context, request, reflector };
  }

  /** The guard must share the context's reflector (public vs protected). */
  function makeGuard(verify: jest.Mock, reflector: Reflector) {
    return new AuthGuard(
      { verifyAsync: verify } as unknown as JwtService,
      { get: () => 'secret' } as unknown as ConfigService,
      reflector,
    );
  }

  it('rejects protected routes without a token', async () => {
    const { context, reflector } = makeContext({ isPublic: false });
    await expect(
      makeGuard(jest.fn(), reflector).canActivate(context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects protected routes with an invalid token', async () => {
    const { context, reflector } = makeContext({
      isPublic: false,
      token: 'bad',
    });
    await expect(
      makeGuard(
        jest.fn(async () => {
          throw new Error('nope');
        }),
        reflector,
      ).canActivate(context),
    ).rejects.toThrow(/Invalid or expired token/);
  });

  it('attaches the payload on protected routes', async () => {
    const { context, request, reflector } = makeContext({
      isPublic: false,
      token: 'good',
    });
    await expect(
      makeGuard(
        jest.fn(async () => payload),
        reflector,
      ).canActivate(context),
    ).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });

  it('lets guests through public routes without a token', async () => {
    const { context, request, reflector } = makeContext({ isPublic: true });
    await expect(
      makeGuard(jest.fn(), reflector).canActivate(context),
    ).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('attaches the user on public routes when a token is present', async () => {
    const { context, request, reflector } = makeContext({
      isPublic: true,
      token: 'good',
    });
    await expect(
      makeGuard(
        jest.fn(async () => payload),
        reflector,
      ).canActivate(context),
    ).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });

  it('ignores a bad token on public routes and stays a guest', async () => {
    const { context, request, reflector } = makeContext({
      isPublic: true,
      token: 'bad',
    });
    await expect(
      makeGuard(
        jest.fn(async () => {
          throw new Error('nope');
        }),
        reflector,
      ).canActivate(context),
    ).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });
});
