import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/** CMS-style pages: about_us, contact, return_policy, terms, etc. */
@Entity()
export class PageSettings extends BaseEntity {
  @Column({ unique: true })
  key: string;

  @Column()
  title: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  titleBN: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  contentBN: string;

  @Column({ default: true })
  isActive: boolean;
}
