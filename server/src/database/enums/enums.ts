export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
}

export enum PaymentMethod {
  COD = 'cod',
  BKASH = 'bkash',
  NAGAD = 'nagad',
  CARD = 'card',
}

/**
 * Gateway family. MFS = mobile financial service (bKash/Nagad/send money),
 * Bank = a bank account transfer. Drives which manual fields the admin must
 * configure and which details the customer must submit at checkout.
 */
export enum PaymentGatewayType {
  MFS = 'mfs',
  BANK = 'bank',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum DeliveryType {
  INSIDE_DHAKA = 'inside_dhaka',
  OUTSIDE_DHAKA = 'outside_dhaka',
}

export enum CouponType {
  FLAT = 'flat',
  PERCENT = 'percent',
}

export enum OrderReturnStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PICKED_UP = 'picked_up',
  REFUNDED = 'refunded',
  COMPLETED = 'completed',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum AddressType {
  SHIPPING = 'shipping',
  BILLING = 'billing',
  HOME = 'home',
  OFFICE = 'office',
}
