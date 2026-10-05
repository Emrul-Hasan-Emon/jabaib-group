import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';

export interface Pagination {
  page: number;
  limit: number;
  size: number;
  offset: number;
}

const MAX_SIZE = 100;

/**
 * Page-size pagination params: `?page=0&size=10`.
 * Consumes the params (deletes them from the query) so the rest of the
 * query object can be used as entity filters.
 */
export const PaginationParams = createParamDecorator(
  (data, ctx: ExecutionContext): Pagination => {
    const req: Request = ctx.switchToHttp().getRequest();
    const pagination = buildPagination(
      req.query.page as string,
      req.query.size as string,
    );
    delete req.query.page;
    delete req.query.size;
    return pagination;
  },
);

export function buildPagination(
  rawPage?: string,
  rawSize?: string,
): Pagination {
  const page = parseInt(rawPage as string) || 0;
  const size = parseInt(rawSize as string) || 10;

  if (isNaN(page) || page < 0 || isNaN(size) || size < 0) {
    throw new BadRequestException('Invalid pagination params');
  }
  // Do not allow fetching large slices of the dataset.
  if (size > MAX_SIZE) {
    throw new BadRequestException(
      `Invalid pagination params: Max size is ${MAX_SIZE}`,
    );
  }

  return { page, limit: size, size, offset: page * size };
}

export function hasNext(count: number, pagination: Pagination) {
  return count > (pagination.page + 1) * pagination.size;
}

export function getPaginateData(
  data: any,
  count: number,
  pagination: Pagination,
) {
  return {
    pagination: {
      totalItems: count,
      page: pagination.page,
      size: pagination.size,
      hasNext: hasNext(count, pagination),
    },
    data,
  };
}
