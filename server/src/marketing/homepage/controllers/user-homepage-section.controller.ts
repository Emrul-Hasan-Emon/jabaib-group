import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserHomepageSectionService } from '../services/user-homepage-section.service';
import { Public } from '../../../auth/decorators/public.decorator';

@ApiTags('Marketing — User')
@Public()
@Controller({ path: 'user/homepage-section', version: '1' })
export class UserHomepageSectionController {
  constructor(private readonly service: UserHomepageSectionService) {}

  @Get()
  @ApiOperation({ summary: 'Active homepage sections with resolved content' })
  list() {
    return this.service.list();
  }
}
