import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';
import { ProductSKUVariant } from './product-sku-variant.entity';
import { decimalTransformer } from './decimal.transformer';

/** One purchasable unit: a specific size + color of a product. */
@Entity()
export class ProductSKU extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  productId: number;

  @Column({ unique: true })
  sku: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  descriptionBN: string;

  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  imagePath: string;

  @Column({ default: 0 })
  quantity: number;

  /** Alert threshold for low stock. */
  @Column({ default: 5 })
  lowStockThreshold: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  myBuyingPrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  price: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  discountedPrice: number;

  @Column({ type: 'timestamp', nullable: true })
  discountedPriceStartDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  discountedPriceEndDate: Date;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @ManyToOne(() => Product, (product) => product.skus, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @OneToMany(() => ProductSKUVariant, (variant) => variant.sku)
  skuVariants: ProductSKUVariant[];
}
