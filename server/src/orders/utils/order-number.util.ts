import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { Order } from '../../database/entities/order.entity';

/** `JAB-<yymmdd>-<4 hex>`, retried until unused. */
export async function nextOrderNumber(manager: EntityManager): Promise<string> {
  const now = new Date();
  const stamp = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = `JAB-${stamp}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const clash = await manager.findOne(Order, {
      where: { orderNumber: candidate },
    });
    if (!clash) return candidate;
  }
  throw new BadRequestException('Could not allocate an order number');
}
