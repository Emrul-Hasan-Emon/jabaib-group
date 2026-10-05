import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AttributeValue } from './attribute-value.entity';

/** Size, Color, Fit, Fabric, Sleeve Length, etc. */
@Entity()
export class Attribute extends BaseEntity {
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

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => AttributeValue, (value) => value.attribute)
  values: AttributeValue[];
}
