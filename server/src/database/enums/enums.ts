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
