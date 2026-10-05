export type AuthUserType = 'admin' | 'user';

export interface JwtPayload {
  /** Subject — the user's email or phone. */
  sub: string;
  /** Primary key of the AdminUser or User row. */
  id: number;
  type: AuthUserType;
  /** AdminUser.role — null for customers. */
  role: string | null;
  userName: string;
}
