import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/** Key-value settings: site name, support phone, delivery info, etc. */
@Entity()
export class SystemSetting extends BaseEntity {
  @Column({ unique: true })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  descriptionBN: string;

  /** Optional grouping, e.g. "general", "shipping", "payment". */
  @Column({ type: 'varchar', length: 50, nullable: true })
  group: string;
}
