import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/** Reusable badge labels for products: "New Arrival", "Sale", "Hot". */
@Entity()
export class ProductLabel extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  nameBN: string;

  @Column({ unique: true })
  slug: string;

  /** Hex background color for the badge UI, e.g. #000000. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  colorCode: string;

  @Column({ default: true })
  isActive: boolean;
}
