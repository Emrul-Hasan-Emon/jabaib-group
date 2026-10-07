import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CouponType } from '../enums/enums';
import { decimalTransformer } from './decimal.transformer';

@Entity()
export class Coupon extends BaseEntity {
  @Column({ unique: true })
  code: string;

  @Column({ type: 'varchar', length: 20 })
  type: string; // CouponType enum values: 'flat' or 'percent'

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  minOrderAmount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  maxDiscountAmount: number;

  @Column({ default: 0 })
  usageLimit: number;

  @Column({ default: 0 })
  usedCount: number;

  @Column({ default: 1 })
  perUserLimit: number;

  @Column({ type: 'timestamp', nullable: true })
  startsAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endsAt: Date;

  @Column({ default: true })
  @Index()
  isActive: boolean;
}
