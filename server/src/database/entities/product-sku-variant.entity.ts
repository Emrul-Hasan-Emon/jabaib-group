import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ProductSKU } from './product-sku.entity';
import { Attribute } from './attribute.entity';
import { AttributeValue } from './attribute-value.entity';

/** Links an SKU to its attribute values, e.g. Size=M, Color=Black. */
@Entity()
export class ProductSKUVariant extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  productSKUId: number;

  @Column({ type: 'int' })
  @Index()
  attributeId: number;

  @Column({ type: 'int' })
  @Index()
  attributeValueId: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => ProductSKU, (sku) => sku.skuVariants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productSKUId' })
  sku: ProductSKU;

  @ManyToOne(() => Attribute)
  @JoinColumn({ name: 'attributeId' })
  attribute: Attribute;

  @ManyToOne(() => AttributeValue)
  @JoinColumn({ name: 'attributeValueId' })
  attributeValue: AttributeValue;
}
