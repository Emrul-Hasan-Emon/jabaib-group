import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Product } from './product.entity';

@Entity()
export class Review extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  userId: number;

  @Column({ type: 'int' })
  @Index()
  productId: number;

  /** Order id, when the review came from a real purchase. */
  @Column({ type: 'int', nullable: true })
  orderId: number;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  /** Array of image urls. */
  @Column({ type: 'jsonb', nullable: true })
  images: string[];

  @Column({ default: false })
  @Index()
  isApproved: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;
}
