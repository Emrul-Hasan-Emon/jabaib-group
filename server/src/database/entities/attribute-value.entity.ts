import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Attribute } from './attribute.entity';

@Entity()
export class AttributeValue extends BaseEntity {
  @Column({ type: 'int' })
  attributeId: number;

  @Column({ type: 'varchar', length: 250 })
  name: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  nameBN: string;

  /** Hex code, e.g. #FF0000 — useful for color swatches. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  colorCode: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Attribute, (attribute) => attribute.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attributeId' })
  attribute: Attribute;
}
