import { PartialType } from '@nestjs/swagger';
import { CreateProductLabelDto } from './create-product-label.dto';

export class UpdateProductLabelDto extends PartialType(CreateProductLabelDto) {}
