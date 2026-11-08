import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class CategoryParentChainsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];
}
