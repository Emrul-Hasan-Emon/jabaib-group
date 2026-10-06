import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserCategoryService } from '../services/user-category.service';
import { Public } from '../../../auth/decorators/public.decorator';

@ApiTags('Catalog — User')
@Public()
@Controller({ path: 'user/category', version: '1' })
export class UserCategoryController {
  constructor(private readonly service: UserCategoryService) {}

  @Get()
  @ApiOperation({ summary: 'List active categories' })
  list() {
    return this.service.listActive();
  }

  @Get('tree')
  @ApiOperation({ summary: 'Active category tree' })
  tree() {
    return this.service.tree();
  }
}
