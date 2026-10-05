import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** Refresh tokens are stored server-side so logout/rotation can revoke them. */
@Entity()
export class AuthToken extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  userId: number;

  /** 'admin' | 'user' — which table userId points into. */
  @Column({ type: 'varchar', length: 10 })
  @Index()
  userType: string;

  @Column({ type: 'text', unique: true })
  token: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  origin: string | null;

  @Column({ default: false })
  @Index()
  revoked: boolean;
}
