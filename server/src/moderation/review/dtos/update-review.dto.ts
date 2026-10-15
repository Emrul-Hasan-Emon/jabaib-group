import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateReviewDto {
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}
