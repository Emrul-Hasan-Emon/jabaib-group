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

/**
 * Self-referencing category tree: "Men" (parentId null) → "T-Shirts"
 * (parentId = Men). Manage nested categories from one table.
 */
@Entity()
export class Category extends BaseEntity {
  @Column({ type: 'varchar', length: 250 })
  name: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  nameBN: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  descriptionBN: string;

  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  imagePath: string;

  @Column({ type: 'int', nullable: true })
  parentId: number;

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parent: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
