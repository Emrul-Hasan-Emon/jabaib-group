import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Category } from './category.entity';
import { ProductSKU } from './product-sku.entity';
import { ProductMedia } from './product-media.entity';
import { ProductLabel } from './product-label.entity';

@Entity()
export class Product extends BaseEntity {
  @Column()
  @Index()
  name: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  nameBN: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  descriptionBN: string;

  @Column({ type: 'int' })
  @Index()
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'text', nullable: true })
  thumbnailPath: string;

  /** Badge shown on the product, e.g. "New", "Sale", "Hot". */
  @Column({ type: 'int', nullable: true })
  @Index()
  productLabelId: number;

  @ManyToOne(() => ProductLabel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productLabelId' })
  productLabel: ProductLabel | null;

  @Column({ default: false })
  @Index()
  isFeatured: boolean;

  @Column({ default: true })
  @Index()
  isPublished: boolean;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'varchar', length: 250, nullable: true })
  seoTitle: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  seoTitleBN: string;

  @Column({ type: 'text', nullable: true })
  seoDescription: string;

  @Column({ type: 'text', nullable: true })
  seoDescriptionBN: string;

  @OneToMany(() => ProductSKU, (sku) => sku.product)
  skus: ProductSKU[];

  @OneToMany(() => ProductMedia, (media) => media.product)
  media: ProductMedia[];
}
