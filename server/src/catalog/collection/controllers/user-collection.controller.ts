import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserCollectionService } from '../services/user-collection.service';
import { Public } from '../../../auth/decorators/public.decorator';

@ApiTags('Catalog — User')
@Public()
@Controller({ path: 'user/collection', version: '1' })
export class UserCollectionController {
  constructor(private readonly service: UserCollectionService) {}

  @Get()
  @ApiOperation({ summary: 'Active collections' })
  list() {
    return this.service.listActive();
  }
}
