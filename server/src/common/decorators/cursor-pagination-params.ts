import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';
import { And, LessThan, MoreThan } from 'typeorm';

export interface CursorPagination {
  cursor: number;
  limit?: number;
}

const MAX_LIMIT = 100;

/** Cursor pagination params: `?cursor=0&limit=10`. Limit is bumped +1 internally to detect the next page. */
export const CursorPaginationParams = createParamDecorator(
  (data, ctx: ExecutionContext): CursorPagination => {
    const req: Request = ctx.switchToHttp().getRequest();
    const cursor = parseInt(req.query.cursor as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;

    if (isNaN(cursor) || cursor < 0 || isNaN(limit) || limit < 0) {
      throw new BadRequestException('Invalid pagination params');
    }
    if (limit > MAX_LIMIT) {
      throw new BadRequestException(
        `Invalid pagination params: Max size is ${MAX_LIMIT}`,
      );
    }

    delete req.query.cursor;
    delete req.query.limit;
    return { cursor, limit: limit + 1 };
  },
);

/**
 * Like CursorPaginationParams, but pagination is opt-in: without `limit`
 * the service returns the full result set.
 */
export const OptionalCursorPaginationParams = createParamDecorator(
  (data, ctx: ExecutionContext): CursorPagination => {
    const req: Request = ctx.switchToHttp().getRequest();
    const cursor = parseInt(req.query.cursor as string) || 0;

    if (cursor < 0) {
      throw new BadRequestException('Invalid pagination params');
    }
    delete req.query.cursor;

    if (req.query.limit === undefined) {
      return { cursor, limit: undefined };
    }

    const limit = parseInt(req.query.limit as string) || 10;
    if (limit < 0) {
      throw new BadRequestException('Invalid pagination params');
    }
    if (limit > MAX_LIMIT) {
      throw new BadRequestException(
        `Invalid pagination params: Max size is ${MAX_LIMIT}`,
      );
    }

    delete req.query.limit;
    return { cursor, limit: limit + 1 };
  },
);

/** Ascending id keyset condition: `id > cursor`. */
export function getWhereWithCursor(where: any, cursor: number) {
  return { ...where, id: MoreThan(cursor) };
}

/** Keyset condition on an arbitrary field (e.g. createdAt). */
export function getWhereWithCursorOrder(
  where: any,
  cursor: any,
  field: string,
  order: 'DESC' | 'ASC',
) {
  const cursorCondition =
    order === 'DESC'
      ? LessThan(cursor || Number.MAX_SAFE_INTEGER)
      : MoreThan(cursor);

  if (where[field]) {
    return { ...where, [field]: And(where[field], cursorCondition) };
  }
  return { ...where, [field]: cursorCondition };
}

/**
 * Shape the result of a cursor query. `limit` must be the +1-bumped value
 * returned by the decorator; the extra row tells us whether a next page exists.
 */
export function getCursorPaginateData(data: any, limit: number) {
  limit = limit - 1;
  const hasNextPage = data.length > limit;
  const items = data.slice(0, limit);

  return {
    items,
    nextCursor: hasNextPage ? items[items.length - 1].id : null,
    hasNextPage,
  };
}

export function getCursorPaginateDataOrder(
  data: any,
  limit: number,
  field: string,
) {
  limit = limit - 1;
  const hasNextPage = data.length > limit;
  const items = data.slice(0, limit);

  return {
    items,
    nextCursor: hasNextPage ? items[items.length - 1][field] : null,
    hasNextPage,
  };
}

/** Manual cursor pagination for pre-sorted arrays. */
export function getCursorPaginateFromSortedArray(
  data: any[],
  cursor: number,
  limit: number,
  cursorField: string = 'id',
) {
  let startIndex = 0;
  if (cursor) {
    const index = data.findIndex((item) => item[cursorField] === cursor);
    startIndex = index >= 0 ? index + 1 : 0;
  }

  const paginatedData = data.slice(startIndex, startIndex + limit);
  const hasNextPage = paginatedData.length === limit;
  const items = hasNextPage ? paginatedData.slice(0, limit - 1) : paginatedData;
  const nextCursor =
    hasNextPage && items.length > 0
      ? items[items.length - 1][cursorField]
      : null;

  return { items, nextCursor, hasNextPage };
}
