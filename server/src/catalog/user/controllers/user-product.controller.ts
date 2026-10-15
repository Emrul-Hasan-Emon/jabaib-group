import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserProductService } from '../services/user-product.service';
import { Public } from '../../../auth/decorators/public.decorator';
import { PaginationParams } from '../../../common/decorators/pagination-params';
import type { Pagination } from '../../../common/decorators/pagination-params';

@ApiTags('Catalog — User')
@Public()
@Controller({ path: 'user/product', version: '1' })
export class UserProductController {
  constructor(private readonly service: UserProductService) {}

  @Get()
  @ApiOperation({
    summary:
      'Browse published products (q, categoryId, collectionId, isFeatured, sort)',
  })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get('facets')
  @ApiOperation({ summary: 'Attribute facet counts for a product scope' })
  facets(@Query() query: Record<string, string>) {
    return this.service.facets(query);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Product detail by slug (storefront URL)' })
  async findBySlug(@Param('slug') slug: string) {
    const product = await this.service.findBySlug(slug);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Product detail by id' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.service.findOne(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
