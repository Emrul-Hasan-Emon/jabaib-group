import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Cart } from './cart.entity';
import { ProductSKU } from './product-sku.entity';
import { decimalTransformer } from './decimal.transformer';
import { Product } from './product.entity';

@Entity()
export class CartItem extends BaseEntity {
  @Column({ type: 'int' })
  cartId: number;

  @Column({ type: 'int' })
  productSKUId: number;

  @Column({ type: 'int' })
  productId: number;

  @Column({ default: 1 })
  quantity: number;

  /** Price captured when added — guards against mid-checkout price edits. */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  unitPrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  unitDiscountedPrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  totalPrice: number; // quantity * unitPrice

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  totalDiscountedPrice: number; // quantity * unitDiscountedPrice

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  @ManyToOne(() => ProductSKU)
  @JoinColumn({ name: 'productSKUId' })
  sku: ProductSKU;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;
}
