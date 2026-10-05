import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Shared shape every entity extends: numeric id plus a lightweight audit
 * trail — created/updated actor as id + type + denormalized name, and a
 * soft-delete timestamp. `creatorType`/`updaterType` say whether the id
 * points into `user`, `admin_user`, or `system`.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;

  /** Id of the actor who created this row — a User id or an AdminUser id, per creatorType. */
  @Column({ type: 'int', nullable: true })
  createdBy: number;

  /** 'user' (customer) | 'admin' | 'system' — tells which table createdBy points into. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  creatorType: string;

  /** Denormalized display name, e.g. "Rafi" or "Admin Panel". */
  @Column({ type: 'varchar', length: 250, nullable: true })
  creatorName: string;

  @Column({ type: 'int', nullable: true })
  updatedBy: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  updaterType: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  updaterName: string;
}
