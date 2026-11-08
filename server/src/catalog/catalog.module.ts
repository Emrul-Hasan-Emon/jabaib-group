import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { AdminCategoryController } from './category/controllers/admin-category.controller';
import { AdminCategoryService } from './category/services/admin-category.service';
import {
  AdminAttributeController,
  AdminAttributeValueController,
} from './attribute/controllers/admin-attribute.controller';
import { AdminAttributeService } from './attribute/services/admin-attribute.service';
import { AdminCollectionController } from './collection/controllers/admin-collection.controller';
import { AdminCollectionService } from './collection/services/admin-collection.service';
import { AdminProductController } from './product/controllers/admin-product.controller';
import { AdminProductService } from './product/services/admin-product.service';
import { AdminSkuController } from './sku/controllers/admin-sku.controller';
import { AdminSkuService } from './sku/services/admin-sku.service';
import { UserCategoryController } from './category/controllers/user-category.controller';
import { UserCategoryService } from './category/services/user-category.service';
import { UserProductController } from './product/controllers/user-product.controller';
import { UserProductService } from './product/services/user-product.service';
import { UserAttributeController } from './attribute/controllers/user-attribute.controller';
import { UserAttributeService } from './attribute/services/user-attribute.service';
import { UserCollectionController } from './collection/controllers/user-collection.controller';
import { UserCollectionService } from './collection/services/user-collection.service';

@Module({
  imports: [FileModule],
  controllers: [
    AdminCategoryController,
    AdminAttributeController,
    AdminAttributeValueController,
    AdminCollectionController,
    AdminProductController,
    AdminSkuController,
    UserCategoryController,
    UserProductController,
    UserAttributeController,
    UserCollectionController,
  ],
  providers: [
    AdminCategoryService,
    AdminAttributeService,
    AdminCollectionService,
    AdminProductService,
    AdminSkuService,
    UserCategoryService,
    UserProductService,
    UserAttributeService,
    UserCollectionService,
  ],
})
export class CatalogModule {}
