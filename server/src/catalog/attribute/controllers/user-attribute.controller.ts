import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAttributeService } from '../services/user-attribute.service';
import { Public } from '../../../auth/decorators/public.decorator';

@ApiTags('Catalog — User')
@Public()
@Controller({ path: 'user/attribute', version: '1' })
export class UserAttributeController {
  constructor(private readonly service: UserAttributeService) {}

  @Get()
  @ApiOperation({ summary: 'Active attributes with values' })
  list() {
    return this.service.listActive();
  }
}
