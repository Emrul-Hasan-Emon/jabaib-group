import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { CartItem } from './cart-item.entity';
import { decimalTransformer } from './decimal.transformer';

@Entity()
export class Cart extends BaseEntity {
  @Column({ type: 'int', nullable: true })
  userId: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  totalPrice: number; // sum of all item totalPrice

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  totalDiscountedPrice: number; // sum of all item totalDiscountedPrice

  /** For guest carts when userId is null. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  sessionId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @OneToMany(() => CartItem, (item) => item.cart)
  items: CartItem[];
}
