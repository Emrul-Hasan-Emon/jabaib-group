import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { ProductSKU } from '../../../database/entities/product-sku.entity';
import { ProductSKUVariant } from '../../../database/entities/product-sku-variant.entity';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateSkuDto, UpdateSkuDto, SkuVariantPairDto } from '../dtos/sku.dto';
import { creatorFields, updaterFields } from '../../utils/catalog.utils';

@Injectable()
export class AdminSkuService {
  constructor(
    private readonly database: DatabaseService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  listByProduct(productId: number) {
    return this.database.productSKU.find({
      where: { productId },
      relations: { skuVariants: { attribute: true, attributeValue: true } },
      order: { isDefault: 'DESC', id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const sku = await this.database.productSKU.findOne({
      where: { id },
      relations: {
        product: true,
        skuVariants: { attribute: true, attributeValue: true },
      },
    });
    if (!sku) throw new NotFoundException('SKU not found');
    return sku;
  }

  async create(productId: number, dto: CreateSkuDto, user?: JwtPayload) {
    const product = await this.database.product.findOne({
      where: { id: productId },
    });
    if (!product) throw new BadRequestException('Product not found');

    await this.validateVariants(dto.variants);
    this.validateDiscount(dto);

    const sku = await this.dataSource.transaction(async (manager) => {
      if (dto.isDefault) {
        await manager.update(
          ProductSKU,
          { productId },
          { isDefault: false },
        );
      }
      const {
        variants: variantPairs,
        discountedPriceStartDate,
        discountedPriceEndDate,
        ...skuData
      } = dto;
      const saved = await manager.save(
        manager.create(ProductSKU, {
          ...skuData,
          productId,
          discountedPrice: dto.discountedPrice ?? dto.price,
          discountedPriceStartDate: discountedPriceStartDate
            ? new Date(discountedPriceStartDate)
            : (null as unknown as Date),
          discountedPriceEndDate: discountedPriceEndDate
            ? new Date(discountedPriceEndDate)
            : (null as unknown as Date),
          ...creatorFields(user),
        }),
      );
      for (const pair of variantPairs) {
        await manager.save(
          manager.create(ProductSKUVariant, {
            productSKUId: saved.id,
            attributeId: pair.attributeId,
            attributeValueId: pair.attributeValueId,
            ...creatorFields(user),
          }),
        );
      }
      return saved;
    });
    return this.findOne(sku.id);
  }

  async update(id: number, dto: UpdateSkuDto, user?: JwtPayload) {
    const existing = await this.findOne(id);

    if (dto.variants) await this.validateVariants(dto.variants);
    const price = dto.price ?? existing.price;
    const discounted = dto.discountedPrice ?? existing.discountedPrice;
    this.validateDiscount({
      price,
      discountedPrice: discounted,
      discountedPriceStartDate:
        dto.discountedPriceStartDate !== undefined
          ? (dto.discountedPriceStartDate ?? undefined)
          : existing.discountedPriceStartDate?.toISOString(),
      discountedPriceEndDate:
        dto.discountedPriceEndDate !== undefined
          ? (dto.discountedPriceEndDate ?? undefined)
          : existing.discountedPriceEndDate?.toISOString(),
    });

    await this.dataSource.transaction(async (manager) => {
      if (dto.isDefault) {
        await manager.update(
          ProductSKU,
          { productId: existing.productId },
          { isDefault: false },
        );
      }
      const { variants, discountedPriceStartDate, discountedPriceEndDate, ...rest } = dto;
      Object.assign(existing, rest, updaterFields(user));
      if (dto.discountedPriceStartDate !== undefined) {
        existing.discountedPriceStartDate = discountedPriceStartDate
          ? new Date(discountedPriceStartDate)
          : (null as unknown as Date);
      }
      if (dto.discountedPriceEndDate !== undefined) {
        existing.discountedPriceEndDate = discountedPriceEndDate
          ? new Date(discountedPriceEndDate)
          : (null as unknown as Date);
      }
      await manager.save(existing);

      if (variants) {
        await manager.delete(ProductSKUVariant, { productSKUId: id });
        for (const pair of variants) {
          await manager.save(
            manager.create(ProductSKUVariant, {
              productSKUId: id,
              attributeId: pair.attributeId,
              attributeValueId: pair.attributeValueId,
              ...creatorFields(user),
            }),
          );
        }
      }
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    const sku = await this.findOne(id);
    await this.database.productSKU.softRemove(sku);
    return { deleted: true };
  }

  private async validateVariants(variants: SkuVariantPairDto[]) {
    const attributeIds = new Set(variants.map((v) => v.attributeId));
    if (attributeIds.size !== variants.length) {
      throw new BadRequestException(
        'Each attribute can appear only once per SKU',
      );
    }
    for (const pair of variants) {
      const [attribute, value] = await Promise.all([
        this.database.attribute.findOne({ where: { id: pair.attributeId } }),
        this.database.attributeValue.findOne({
          where: { id: pair.attributeValueId },
        }),
      ]);
      if (!attribute) {
        throw new BadRequestException(
          `Attribute ${pair.attributeId} not found`,
        );
      }
      if (!value || value.attributeId !== pair.attributeId) {
        throw new BadRequestException(
          `AttributeValue ${pair.attributeValueId} does not belong to attribute ${pair.attributeId}`,
        );
      }
    }
  }

  private validateDiscount(dto: {
    price: number;
    discountedPrice?: number | null;
    discountedPriceStartDate?: string;
    discountedPriceEndDate?: string;
  }) {
    if (
      dto.discountedPrice !== undefined &&
      dto.discountedPrice !== null &&
      dto.discountedPrice > dto.price
    ) {
      throw new BadRequestException(
        'discountedPrice cannot exceed price',
      );
    }
    if (dto.discountedPriceStartDate && dto.discountedPriceEndDate) {
      if (
        new Date(dto.discountedPriceEndDate) <=
        new Date(dto.discountedPriceStartDate)
      ) {
        throw new BadRequestException(
          'discountedPriceEndDate must be after discountedPriceStartDate',
        );
      }
    }
  }
}
