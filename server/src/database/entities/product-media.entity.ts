import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';
import { MediaType } from '../enums/enums';

@Entity()
export class ProductMedia extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  productId: number;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'text', nullable: true })
  path: string;

  @Column({ type: 'varchar', length: 20, default: MediaType.IMAGE })
  type: MediaType;

  @Column({ type: 'text', nullable: true })
  altText: string;

  @Column({ type: 'text', nullable: true })
  altTextBN: string;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Product, (product) => product.media, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;
}
