import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { Cart } from '../../database/entities/cart.entity';
import { CartItem } from '../../database/entities/cart-item.entity';
import { Product } from '../../database/entities/product.entity';
import { ProductSKU } from '../../database/entities/product-sku.entity';
import { effectiveSkuPrice } from '../../catalog/user/utils/product-summary';
import { skuLabel } from '../../catalog/utils/sku-label';
import { AddCartItemDto } from '../dtos/cart.dto';

/** One cart line as the storefront needs it (card-ready product snapshot). */
export interface CartLineView {
  id: number;
  productId: number;
  productSKUId: number;
  name: string;
  nameBN: string | null;
  slug: string;
  image: string | null;
  skuLabel: string;
  sku: string;
  unitPrice: number;
  unitDiscountedPrice: number;
  quantity: number;
  lineTotal: number;
  lineDiscountedTotal: number;
  maxQuantity: number;
  inStock: boolean;
}

/**
 * Customer cart. Works for guests (identified by the `x-cart-session` header,
 * a client-generated id) and for signed-in customers (cart keyed by userId);
 * `merge()` folds a guest cart into the customer's own on login.
 *
 * Prices are always resolved server-side from the SKU — the client never sends
 * amounts — and quantities are clamped to the SKU's live stock.
 */
@Injectable()
export class UserCartService {
  constructor(private readonly database: DatabaseService) {}

  /** Empty cart shape so guests without a session get a usable response. */
  private emptyCart() {
    return {
      items: [],
      totals: { itemCount: 0, subtotal: 0, total: 0, savings: 0 },
    };
  }

  private async findCart(
    userId: number | null,
    sessionId?: string,
  ): Promise<Cart | null> {
    if (userId) {
      return this.database.cart.findOne({
        where: { userId },
        relations: { items: true },
      });
    }
    if (!sessionId) return null;
    return this.database.cart.findOne({
      where: { sessionId },
      relations: { items: true },
    });
  }

  private async ensureCart(
    userId: number | null,
    sessionId?: string,
  ): Promise<Cart> {
    const existing = await this.findCart(userId, sessionId);
    if (existing) return existing;
    if (!userId && !sessionId) {
      throw new BadRequestException(
        'Guests must send the x-cart-session header to use a cart',
      );
    }
    const data: Partial<Cart> = {
      userId: userId ?? undefined,
      sessionId: userId ? undefined : sessionId,
    };
    return this.database.cart.save(this.database.cart.create(data));
  }

  private requireSession(sessionId?: string): string {
    if (!sessionId || sessionId.trim().length < 8) {
      throw new BadRequestException(
        'Missing or invalid cart session — send the x-cart-session header',
      );
    }
    return sessionId.trim();
  }

  /** Cheapest in-stock active SKU, used when the client adds "no variant". */
  private pickDefaultSku(product: Product): ProductSKU | null {
    const candidates = (product.skus ?? []).filter((s) => s.isActive);
    if (!candidates.length) return null;
    const inStock = candidates.filter((s) => s.quantity > 0);
    const pool = inStock.length ? inStock : candidates;
    return pool.reduce((best, sku) =>
      effectiveSkuPrice(sku) < effectiveSkuPrice(best) ? sku : best,
    );
  }

  private resolveSku(product: Product, productSKUId?: number): ProductSKU {
    const skus = product.skus ?? [];
    if (productSKUId) {
      const sku = skus.find((s) => s.id === productSKUId);
      if (!sku || !sku.isActive) {
        throw new BadRequestException('That variant is no longer available');
      }
      return sku;
    }
    const fallback = this.pickDefaultSku(product);
    if (!fallback) {
      throw new BadRequestException(
        'This product is not purchasable right now',
      );
    }
    return fallback;
  }

  private lineView(item: CartItem): CartLineView {
    const product = item.product;
    const media = product?.media ?? [];
    const primary =
      media.find((m) => m.isPrimary)?.url ?? product?.thumbnailUrl ?? null;
    const unitPrice = Number(item.unitPrice ?? 0);
    const unitDiscountedPrice = Number(item.unitDiscountedPrice ?? unitPrice);
    return {
      id: item.id,
      productId: item.productId,
      productSKUId: item.productSKUId,
      name: product?.name ?? '',
      nameBN: product?.nameBN ?? null,
      slug: product?.slug ?? '',
      image: primary,
      skuLabel: skuLabel(item.sku ?? ({} as ProductSKU)),
      sku: item.sku?.sku ?? '',
      unitPrice,
      unitDiscountedPrice,
      quantity: item.quantity,
      lineTotal: round2(unitPrice * item.quantity),
      lineDiscountedTotal: round2(unitDiscountedPrice * item.quantity),
      maxQuantity: item.sku?.quantity ?? 0,
      inStock: (item.sku?.quantity ?? 0) > 0,
    };
  }

  /** Read the cart (creating nothing) with lines + totals. */
  async get(userId: number | null, sessionId?: string) {
    const cart = await this.findCart(userId, sessionId);
    if (!cart) return this.emptyCart();

    const items = await this.database.cartItem.find({
      where: { cartId: cart.id },
      relations: {
        product: { media: true },
        sku: { skuVariants: { attribute: true, attributeValue: true } },
      },
      order: { id: 'ASC' },
    });
    return {
      items: items.map((i) => this.lineView(i)),
      totals: totalsOf(items),
    };
  }

  async add(
    userId: number | null,
    sessionId: string | undefined,
    dto: AddCartItemDto,
  ) {
    const product = await this.database.product.findOne({
      where: { id: dto.productId, isPublished: true, isActive: true },
      relations: {
        media: true,
        skus: { skuVariants: { attribute: true, attributeValue: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    const sku = this.resolveSku(product, dto.productSKUId);
    const stock = sku.quantity;
    if (stock <= 0) throw new BadRequestException('This item is out of stock');

    const cart = await this.ensureCart(userId, sessionId);
    const existing = await this.database.cartItem.findOne({
      where: { cartId: cart.id, productId: product.id, productSKUId: sku.id },
    });

    const quantity = Math.min(
      99,
      (existing?.quantity ?? 0) + (dto.quantity ?? 1),
      stock,
    );

    const unitPrice = Number(sku.price);
    const unitDiscountedPrice = effectiveSkuPrice(sku);
    const row: Partial<CartItem> = {
      cartId: cart.id,
      productId: product.id,
      productSKUId: sku.id,
      quantity,
      unitPrice,
      unitDiscountedPrice,
      totalPrice: round2(unitPrice * quantity),
      totalDiscountedPrice: round2(unitDiscountedPrice * quantity),
    };

    if (existing) {
      await this.database.cartItem.save({ ...existing, ...row });
    } else {
      await this.database.cartItem.save(this.database.cartItem.create(row));
    }

    await this.recalc(cart.id, userId);
    return this.get(userId, sessionId);
  }

  async updateQuantity(
    userId: number | null,
    sessionId: string | undefined,
    itemId: number,
    quantity: number,
  ) {
    const cart = await this.findCart(userId, sessionId);
    if (!cart) throw new NotFoundException('Cart is empty');
    const item = await this.database.cartItem.findOne({
      where: { id: itemId, cartId: cart.id },
      relations: { sku: true },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    const stock = item.sku?.quantity ?? 0;
    if (stock <= 0) throw new BadRequestException('This item is out of stock');
    item.quantity = Math.min(quantity, 99, stock);

    const unitPrice = Number(item.unitPrice ?? 0);
    const unitDiscountedPrice = Number(item.unitDiscountedPrice ?? unitPrice);
    item.totalPrice = round2(unitPrice * item.quantity);
    item.totalDiscountedPrice = round2(unitDiscountedPrice * item.quantity);
    await this.database.cartItem.save(item);

    await this.recalc(cart.id, userId);
    return this.get(userId, sessionId);
  }

  async removeItem(
    userId: number | null,
    sessionId: string | undefined,
    itemId: number,
  ) {
    const cart = await this.findCart(userId, sessionId);
    if (!cart) throw new NotFoundException('Cart is empty');
    const item = await this.database.cartItem.findOne({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.database.cartItem.remove(item);
    await this.recalc(cart.id, userId);
    return this.get(userId, sessionId);
  }

  async clear(userId: number | null, sessionId?: string) {
    const cart = await this.findCart(userId, sessionId);
    if (cart) {
      await this.database.cartItem.delete({ cartId: cart.id });
      await this.database.cart.remove(cart);
    }
    return this.emptyCart();
  }

  /**
   * Fold a guest cart into the customer's own (called right after login).
   * Quantities are summed per product+SKU and clamped to live stock; the guest
   * cart is dropped so a later logout does not resurrect it.
   */
  async merge(userId: number, sessionId?: string) {
    if (!sessionId) return this.get(userId);
    const guestCart = await this.database.cart.findOne({
      where: { sessionId },
      relations: { items: true },
    });
    if (!guestCart || guestCart.userId) return this.get(userId);

    const cart = await this.ensureCart(userId);
    const current = await this.database.cartItem.find({
      where: { cartId: cart.id },
    });

    for (const guestItem of guestCart.items ?? []) {
      const sku = await this.database.productSKU.findOne({
        where: { id: guestItem.productSKUId },
        relations: { skuVariants: true },
      });
      if (!sku || !sku.isActive || sku.quantity <= 0) continue;

      const twin = current.find(
        (c) =>
          c.productId === guestItem.productId &&
          c.productSKUId === guestItem.productSKUId,
      );
      const quantity = Math.min(
        99,
        (twin?.quantity ?? 0) + guestItem.quantity,
        sku.quantity,
      );
      const unitPrice = Number(sku.price);
      const unitDiscountedPrice = effectiveSkuPrice(sku);

      if (twin) {
        twin.quantity = quantity;
        twin.unitPrice = unitPrice;
        twin.unitDiscountedPrice = unitDiscountedPrice;
        twin.totalPrice = round2(unitPrice * quantity);
        twin.totalDiscountedPrice = round2(unitDiscountedPrice * quantity);
        await this.database.cartItem.save(twin);
      } else {
        await this.database.cartItem.save(
          this.database.cartItem.create({
            cartId: cart.id,
            productId: guestItem.productId,
            productSKUId: sku.id,
            quantity,
            unitPrice,
            unitDiscountedPrice,
            totalPrice: round2(unitPrice * quantity),
            totalDiscountedPrice: round2(unitDiscountedPrice * quantity),
            createdBy: userId,
            creatorType: 'user',
          }),
        );
      }
    }

    await this.database.cartItem.delete({ cartId: guestCart.id });
    await this.database.cart.remove(guestCart);
    await this.recalc(cart.id, userId);
    return this.get(userId);
  }

  /** Keep the cart's denormalised money columns in step with its items. */
  private async recalc(cartId: number, userId: number | null) {
    const items = await this.database.cartItem.find({ where: { cartId } });
    const cart = await this.database.cart.findOne({ where: { id: cartId } });
    if (!cart) return;
    cart.totalPrice = totalsOf(items).subtotal;
    cart.totalDiscountedPrice = totalsOf(items).total;
    if (userId) {
      // A merged cart becomes the customer's own: drop the guest session key.
      cart.userId = userId;
      cart.sessionId = undefined as unknown as string;
    }
    await this.database.cart.save(cart);
  }

  /** Fresh guest session id — the web client calls this to bootstrap storage. */
  newSessionId(): string {
    return randomBytes(16).toString('hex');
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function totalsOf(items: CartItem[]) {
  let itemCount = 0;
  let subtotal = 0;
  let total = 0;
  for (const i of items) {
    const unitPrice = Number(i.unitPrice ?? 0);
    const unitDiscountedPrice = Number(i.unitDiscountedPrice ?? unitPrice);
    itemCount += i.quantity;
    subtotal += unitPrice * i.quantity;
    total += unitDiscountedPrice * i.quantity;
  }
  return {
    itemCount,
    subtotal: round2(subtotal),
    total: round2(total),
    savings: round2(subtotal - total),
  };
}
