import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AdminUserRoleEnum } from '../enums/user-type.enum';

@Entity()
export class AdminUser extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'text' })
  passwordHash: string;

  /** "super_admin" | "admin" | "editor" — gate admin routes. */
  @Column({ type: 'varchar', length: 50, default: AdminUserRoleEnum.EDITOR })
  role: string;

  @Column({ default: true })
  @Index()
  isActive: boolean;
}
