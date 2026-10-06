import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserProductLabelService } from '../services/user-product-label.service';
import { Public } from '../../../auth/decorators/public.decorator';

@ApiTags('Catalog — User')
@Public()
@Controller({ path: 'user/product-label', version: '1' })
export class UserProductLabelController {
  constructor(private readonly service: UserProductLabelService) {}

  @Get()
  @ApiOperation({ summary: 'Active product labels' })
  list() {
    return this.service.listActive();
  }
}
