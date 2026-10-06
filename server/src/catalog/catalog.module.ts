import { Module } from '@nestjs/common';
import { AdminCategoryController } from './category/controllers/admin-category.controller';
import { AdminCategoryService } from './category/services/admin-category.service';
import {
  AdminAttributeController,
  AdminAttributeValueController,
} from './attribute/controllers/admin-attribute.controller';
import { AdminAttributeService } from './attribute/services/admin-attribute.service';
import { AdminProductLabelController } from './product-label/controllers/admin-product-label.controller';
import { AdminProductLabelService } from './product-label/services/admin-product-label.service';
import { AdminProductController } from './product/controllers/admin-product.controller';
import { AdminProductService } from './product/services/admin-product.service';
import { AdminSkuController } from './sku/controllers/admin-sku.controller';
import { AdminSkuService } from './sku/services/admin-sku.service';
import { UserCategoryController } from './user/controllers/user-category.controller';
import { UserCategoryService } from './user/services/user-category.service';
import { UserProductController } from './user/controllers/user-product.controller';
import { UserProductService } from './user/services/user-product.service';
import { UserAttributeController } from './user/controllers/user-attribute.controller';
import { UserAttributeService } from './user/services/user-attribute.service';
import { UserProductLabelController } from './user/controllers/user-product-label.controller';
import { UserProductLabelService } from './user/services/user-product-label.service';

@Module({
  controllers: [
    AdminCategoryController,
    AdminAttributeController,
    AdminAttributeValueController,
    AdminProductLabelController,
    AdminProductController,
    AdminSkuController,
    UserCategoryController,
    UserProductController,
    UserAttributeController,
    UserProductLabelController,
  ],
  providers: [
    AdminCategoryService,
    AdminAttributeService,
    AdminProductLabelService,
    AdminProductService,
    AdminSkuService,
    UserCategoryService,
    UserProductService,
    UserAttributeService,
    UserProductLabelService,
  ],
})
export class CatalogModule {}
