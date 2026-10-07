/**
 * Unit-test stub for `@nestjs/typeorm` (v12 is ESM-only; Jest in CJS mode
 * cannot require it). Unit specs inject a mock `DatabaseService`, so the real
 * TypeOrmModule/DataSource wiring is never needed — only the decorators and
 * module helper are referenced, and only for type/DI-token purposes.
 *
 * This mapping lives in the unit jest config (package.json `jest` key) only;
 * the e2e config (test/jest-e2e.json) loads the real package.
 */

/** @returns A no-op property/method decorator factory, matching InjectRepository usage. */
export const InjectRepository =
  () =>
  (_target: unknown, _propertyKey?: string | symbol, _descriptor?: unknown) =>
    undefined;

export const InjectDataSource =
  () =>
  (_target: unknown, _propertyKey?: string | symbol, _descriptor?: unknown) =>
    undefined;

export const TypeOrmModule = {
  forRoot: () => ({}),
  forRootAsync: () => ({}),
};

export const InjectEntityManager =
  () =>
  (_target: unknown, _propertyKey?: string | symbol, _descriptor?: unknown) =>
    undefined;

/** @nestjs/config is ESM-only in v4+; stub it for unit tests the same way. */
export class ConfigService {
  get(_key: string, _defaultValue?: unknown) {
    return _defaultValue;
  }
}

export const ConfigModule = {
  forRoot: () => ({}),
  forRootAsync: () => ({}),
};
/** @nestjs/jwt is ESM-only in v4+; stub it for unit tests like the others. */
export class JwtService {
  sign(_payload: unknown, _options?: unknown): string {
    return 'stub-token';
  }
  verifyAsync<T = unknown>(_token: string, _options?: unknown): Promise<T> {
    return Promise.resolve({} as T);
  }
}

export const JwtModule = {
  register: () => ({}),
  registerAsync: () => ({}),
};
