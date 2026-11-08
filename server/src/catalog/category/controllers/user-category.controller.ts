import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserCategoryService } from '../services/user-category.service';
import { Public } from '../../../auth/decorators/public.decorator';

@ApiTags('Catalog — User')
@Public()
@Controller({ path: 'user/category', version: '1' })
export class UserCategoryController {
  constructor(private readonly service: UserCategoryService) {}

  @Get()
  @ApiOperation({
    summary:
      'List active categories — omit parentId for all (flat); "null" for roots only; a numeric id for its direct children only',
  })
  @ApiQuery({ name: 'parentId', required: false, type: String })
  list(@Query('parentId') parentId?: string) {
    return this.service.listActive(parentId);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Active category tree' })
  tree() {
    return this.service.tree();
  }
}
