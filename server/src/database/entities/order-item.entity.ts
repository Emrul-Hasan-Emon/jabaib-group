import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';
import { Product } from './product.entity';
import { ProductSKU } from './product-sku.entity';
import { decimalTransformer } from './decimal.transformer';

@Entity()
export class OrderItem extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  orderId: number;

  @Column({ type: 'int' })
  productId: number;

  @Column({ type: 'int' })
  productSKUId: number;

  /** Snapshot values — survives later product edits or deletions. */
  @Column()
  productName: string;

  @Column()
  skuData: string; // JSON string of the SKU data at the time of order

  @Column()
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  unitPrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  unitDiscountedPricePrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  totalPrice: number; // quantity * unitPrice

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  totalDiscountedPrice: number; // quantity * unitDiscountedPrice

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => ProductSKU)
  @JoinColumn({ name: 'productSKUId' })
  productSKU: ProductSKU;
}
