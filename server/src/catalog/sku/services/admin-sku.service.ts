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
import { FileHandleService } from '../../../file/services/file-handle.service';
import { UPLOAD_FOLDERS } from '../../../file/upload-folders';

@Injectable()
export class AdminSkuService {
  constructor(
    private readonly database: DatabaseService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly fileHandle: FileHandleService,
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
        await manager.update(ProductSKU, { productId }, { isDefault: false });
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

    const price = dto.price ?? existing.price;
    const discounted =
      dto.discountedPrice !== undefined
        ? dto.discountedPrice
        : existing.discountedPrice;
    this.validateDiscount({ price, discountedPrice: discounted });

    const previousImagePath = existing.imagePath;
    const nextImagePath = dto.imagePath ?? existing.imagePath;

    await this.dataSource.transaction(async (manager) => {
      if (dto.isDefault) {
        await manager.update(
          ProductSKU,
          { productId: existing.productId },
          { isDefault: false },
        );
      }
      // Only the editable fields — variants/code/stock are immutable after creation.
      // Using manager.update (not save of the loaded entity) so the relation is
      // never re-derived into the FK column.
      const patch: Partial<ProductSKU> = {};
      if (dto.price !== undefined) patch.price = dto.price;
      if (dto.discountedPrice !== undefined)
        patch.discountedPrice = dto.discountedPrice;
      if (dto.isActive !== undefined) patch.isActive = dto.isActive;
      if (dto.isDefault !== undefined) patch.isDefault = dto.isDefault;
      if (dto.imageUrl !== undefined) patch.imageUrl = dto.imageUrl;
      if (dto.imagePath !== undefined) patch.imagePath = dto.imagePath;
      await manager.update(
        ProductSKU,
        { id },
        { ...patch, ...updaterFields(user) },
      );
    });

    // Replace/clear: drop the superseded SKU image file after the update.
    if (
      previousImagePath &&
      nextImagePath !== previousImagePath &&
      this.fileHandle.belongsTo(UPLOAD_FOLDERS.productSku, previousImagePath)
    ) {
      this.fileHandle.removeIfExists(previousImagePath);
    }
    return this.findOne(id);
  }

  /** Feature-owned upload for the SKU image (product/sku folder). */
  uploadImage(file: Express.Multer.File) {
    return this.fileHandle.uploadFile(file, UPLOAD_FOLDERS.productSku);
  }

  /** Feature-owned removal: deletes the physical file and clears image fields. */
  async removeImage(id: number, user?: JwtPayload) {
    const sku = await this.findOne(id);
    const previousImagePath = sku.imagePath;
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        ProductSKU,
        { id },
        { imageUrl: '', imagePath: '', ...updaterFields(user) },
      );
    });
    if (previousImagePath) this.fileHandle.removeIfExists(previousImagePath);
    return this.findOne(id);
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
      throw new BadRequestException('discountedPrice cannot exceed price');
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
