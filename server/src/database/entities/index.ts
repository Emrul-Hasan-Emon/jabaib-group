import { User } from './user.entity';
import { AdminUser } from './admin-user.entity';
import { AuthProvider } from './auth-provider.entity';
import { Address } from './address.entity';
import { Category } from './category.entity';
import { Country } from './country.entity';
import { Division } from './division.entity';
import { District } from './district.entity';
import { Attribute } from './attribute.entity';
import { AttributeValue } from './attribute-value.entity';
import { Product } from './product.entity';
import { ProductMedia } from './product-media.entity';
import { ProductSKU } from './product-sku.entity';
import { ProductSKUVariant } from './product-sku-variant.entity';
import { ProductLabel } from './product-label.entity';
import { Wishlist } from './wishlist.entity';
import { Review } from './review.entity';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Coupon } from './coupon.entity';
import { CouponHistoryLog } from './coupon-history-log.entity';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { OrderAddress } from './order-address.entity';
import { OrderReturn } from './order-return.entity';
import { OrderReturnItem } from './order-return-item.entity';
import { OrderReturnStatusHistory } from './order-return-status-history.entity';
import { Payment } from './payment.entity';
import { ShippingZone } from './shipping-zone.entity';
import { Banner } from './banner.entity';
import { HomepageSection } from './homepage-section.entity';
import { PageSettings } from './page-settings.entity';
import { SystemSetting } from './system-setting.entity';
import { Language } from './language.entity';

export { BaseEntity } from './base.entity';
export { decimalTransformer } from './decimal.transformer';
export { User } from './user.entity';
export { AdminUser } from './admin-user.entity';
export { AuthProvider } from './auth-provider.entity';
export { Address } from './address.entity';
export { Category } from './category.entity';
export { Country } from './country.entity';
export { Division } from './division.entity';
export { District } from './district.entity';
export { Attribute } from './attribute.entity';
export { AttributeValue } from './attribute-value.entity';
export { Product } from './product.entity';
export { ProductMedia } from './product-media.entity';
export { ProductSKU } from './product-sku.entity';
export { ProductSKUVariant } from './product-sku-variant.entity';
export { ProductLabel } from './product-label.entity';
export { Wishlist } from './wishlist.entity';
export { Review } from './review.entity';
export { Cart } from './cart.entity';
export { CartItem } from './cart-item.entity';
export { Coupon } from './coupon.entity';
export { CouponHistoryLog } from './coupon-history-log.entity';
export { Order } from './order.entity';
export { OrderItem } from './order-item.entity';
export { OrderStatusHistory } from './order-status-history.entity';
export { OrderAddress } from './order-address.entity';
export { OrderReturn } from './order-return.entity';
export { OrderReturnItem } from './order-return-item.entity';
export { OrderReturnStatusHistory } from './order-return-status-history.entity';
export { Payment } from './payment.entity';
export { ShippingZone } from './shipping-zone.entity';
export { Banner } from './banner.entity';
export { HomepageSection } from './homepage-section.entity';
export { PageSettings } from './page-settings.entity';
export { SystemSetting } from './system-setting.entity';
export { Language } from './language.entity';

/** Every entity, for the DataSource `entities` array and Nest `forFeature`. */
export const ENTITIES = [
  User,
  AdminUser,
  AuthProvider,
  Address,
  Category,
  Country,
  Division,
  District,
  Attribute,
  AttributeValue,
  Product,
  ProductMedia,
  ProductSKU,
  ProductSKUVariant,
  ProductLabel,
  Wishlist,
  Review,
  Cart,
  CartItem,
  Coupon,
  CouponHistoryLog,
  Order,
  OrderItem,
  OrderStatusHistory,
  OrderAddress,
  OrderReturn,
  OrderReturnItem,
  OrderReturnStatusHistory,
  Payment,
  ShippingZone,
  Banner,
  HomepageSection,
  PageSettings,
  SystemSetting,
  Language,
] as const;
