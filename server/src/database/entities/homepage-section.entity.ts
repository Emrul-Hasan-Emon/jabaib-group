import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Homepage sections configured from the admin panel, e.g.
 * "New Arrivals" (type: products), "Shop by Category" (type: categories).
 * The referenced ids live in `content`.
 */
@Entity()
export class HomepageSection extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  titleBN: string;

  @Column({ unique: true })
  key: string;

  /** products | categories | banners | custom */
  @Column({ type: 'varchar', length: 50 })
  type: string;

  /** Flexible payload: { productIds?: number[], categoryIds?: number[], limit?: number, imageUrl?: string } */
  @Column({ type: 'jsonb', nullable: true })
  content: Record<string, unknown>;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  @Index()
  isActive: boolean;
}
