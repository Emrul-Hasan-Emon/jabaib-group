import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity()
export class Language extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  @Index()
  isActive: boolean;
}
