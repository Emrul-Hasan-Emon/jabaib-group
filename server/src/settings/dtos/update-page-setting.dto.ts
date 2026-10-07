import { PartialType } from '@nestjs/swagger';
import { CreatePageSettingDto } from './create-page-setting.dto';

export class UpdatePageSettingDto extends PartialType(CreatePageSettingDto) {}
