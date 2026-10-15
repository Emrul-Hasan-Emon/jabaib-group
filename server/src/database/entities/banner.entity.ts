import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity()
export class Banner extends BaseEntity {
  @Column({ type: 'varchar', length: 250 })
  title: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  titleBN: string;

  @Column({ type: 'text' })
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  imagePath: string;

  @Column({ type: 'text', nullable: true })
  mobileImageUrl: string;

  @Column({ type: 'text', nullable: true })
  mobileImagePath: string;

  /** Where clicking the banner goes, e.g. /products/slug or /collections/slug. */
  @Column({ type: 'text', nullable: true })
  linkUrl: string;

  /** e.g. "hero", "side", "popup". */
  @Column({ type: 'varchar', length: 50, nullable: true })
  position: string;

  @Column({ type: 'timestamp', nullable: true })
  startsAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endsAt: Date;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;
}
