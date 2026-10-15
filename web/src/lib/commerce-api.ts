import { API_URL } from "./config";
import type { CustomerApiClient } from "./customer-api";

/** Cart API — works for guests (x-cart-session) and signed-in customers. */

export const CART_SESSION_KEY = "jabaibCartSession";

/** Stable per-browser cart session id so a guest cart survives reloads. */
export function getCartSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(CART_SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(CART_SESSION_KEY, id);
  }
  return id;
}

export interface CartItem {
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

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  total: number;
  savings: number;
}

export interface CartResponse {
  items: CartItem[];
  totals: CartTotals;
}

export const emptyCart: CartResponse = {
  items: [],
  totals: { itemCount: 0, subtotal: 0, total: 0, savings: 0 },
};

const sessionHeader = (): Record<string, string> => ({
  "x-cart-session": getCartSessionId(),
});

export const cartApi = {
  get: (api: CustomerApiClient) =>
    api.get<CartResponse>("/v1/user/cart", sessionHeader()),
  add: (
    api: CustomerApiClient,
    body: { productId: number; productSKUId?: number; quantity?: number },
  ) => api.post<CartResponse>("/v1/user/cart/items", body, sessionHeader()),
  setQuantity: (api: CustomerApiClient, itemId: number, quantity: number) =>
    api.patch<CartResponse>(
      `/v1/user/cart/items/${itemId}`,
      { quantity },
      sessionHeader(),
    ),
  remove: (api: CustomerApiClient, itemId: number) =>
    api.del<CartResponse>(`/v1/user/cart/items/${itemId}`, sessionHeader()),
  clear: (api: CustomerApiClient) =>
    api.del<CartResponse>("/v1/user/cart", sessionHeader()),
  /** Fold the guest cart into the customer's own right after login. */
  merge: (api: CustomerApiClient) =>
    api.post<CartResponse>("/v1/user/cart/merge", {
      sessionId: getCartSessionId(),
    }),
};

// ------------------------------------------------------------------ coupons --

export interface CouponCheck {
  valid: boolean;
  code: string;
  type?: string;
  discountAmount: number;
  message?: string;
}

export interface SavedAddress {
  id: number;
  recipientName: string;
  phone: string;
  address: string;
  divisionId?: number;
  districtId?: number;
  zipCode?: string;
  isDefault: boolean;
}

export const addressApi = {
  list: (api: CustomerApiClient) => api.get<SavedAddress[]>("/v1/user/address"),
  create: (
    api: CustomerApiClient,
    body: {
      recipientName: string;
      phone: string;
      address: string;
      divisionId?: number;
      districtId?: number;
      zipCode?: string;
    },
  ) => api.post<SavedAddress>("/v1/user/address", body),
};

export const couponApi = {
  preview: (api: CustomerApiClient, code: string, subtotal: number) =>
    api.get<CouponCheck>(
      `/v1/user/coupon/${encodeURIComponent(code)}/preview?subtotal=${Math.round(subtotal)}`,
    ),
};

// ----------------------------------------------------------------- checkout --

export interface CheckoutPayload {
  addressId?: number;
  recipientName?: string;
  phone?: string;
  address?: string;
  divisionId?: number;
  districtId?: number;
  zipCode?: string;
  deliveryType: "inside_dhaka" | "outside_dhaka";
  couponCode?: string;
  note?: string;
  paymentMethod: "cod" | "bkash" | "nagad" | "card";
  transactionId?: string;
  /** Configured gateway to pay with; omit to use the built-in methods above. */
  paymentGatewayId?: number;
  /** What the customer submits for a manual gateway (validated server-side). */
  paymentMetaData?: Record<string, string>;
}

// -------------------------------------------------------- payment gateways --

/** One field a manual payment collects, described by the server. */
export interface ManualPaymentField {
  key: string;
  label: string;
  labelBN: string;
  maxLength: number;
  placeholder?: string;
  copyable?: boolean;
}

/** An active gateway as the storefront sees it. */
export interface PaymentGatewayOption {
  id: number;
  name: string;
  nameBN: string;
  slug: string;
  type: "mfs" | "bank";
  isManual: boolean;
  /** Sanitized rich text with the payment instructions. */
  description: string;
  iconUrl: string | null;
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName: string;
  /** Empty for automated gateways — they need no customer input. */
  fields: ManualPaymentField[];
}

export interface CheckoutPreview {
  items: {
    productId: number;
    productSKUId: number;
    name: string;
    slug: string | null;
    image: string | null;
    skuLabel: string;
    quantity: number;
    unitPrice: number;
    unitDiscountedPrice: number;
    totalPrice: number;
    totalDiscountedPrice: number;
  }[];
  address: {
    recipientName: string;
    phone: string;
    address: string;
    divisionId?: number;
    districtId?: number;
    zipCode?: string;
  };
  delivery: {
    type: string;
    label: string;
    charge: number;
    estimatedDays: number | null;
  };
  coupon: CouponCheck | null;
  payment: {
    method: string;
    metaData: Record<string, string> | null;
    transactionId?: string;
  };
  totals: {
    itemCount: number;
    listTotal: number;
    subtotal: number;
    deliveryCharge: number;
    discountAmount: number;
    total: number;
  };
}

export const paymentGatewayApi = {
  listActive: (api: CustomerApiClient) =>
    api.get<PaymentGatewayOption[]>("/v1/user/payment-gateway"),
};

export const checkoutApi = {
  preview: (api: CustomerApiClient, body: CheckoutPayload) =>
    api.post<CheckoutPreview>("/v1/user/checkout/preview", body),
  place: (api: CustomerApiClient, body: CheckoutPayload) =>
    api.post<{ id: number }>("/v1/user/order", body),
};

// ------------------------------------------------------------------- orders --

export interface OrderSummary {
  id: number;
  orderNumber: string;
  status: string;
  deliveryType: string;
  paymentMethod: string;
  paymentStatus: string;
  itemCount: number;
  total: number;
  subtotal: number;
  deliveryCharge: number;
  discountAmount: number;
  couponCode: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  returnStatus: string | null;
}

export interface OrderDetail {
  id: number;
  orderNumber: string;
  status: string;
  deliveryType: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  deliveryCharge: number;
  discountAmount: number;
  couponCode: string | null;
  total: number;
  note: string | null;
  createdAt: string;
  items: {
    id: number;
    productId: number;
    productSKUId: number;
    name: string;
    slug: string | null;
    image: string | null;
    skuData: unknown;
    quantity: number;
    unitPrice: number;
    unitDiscountedPrice: number;
    totalPrice: number;
    totalDiscountedPrice: number;
  }[];
  address: {
    recipientName: string;
    phone: string;
    address: string;
    zipCode: string | null;
    division: { name: string } | null;
    district: { name: string } | null;
  } | null;
  statusHistory: { status: string; note: string | null; at: string }[];
  payments: {
    method: string;
    status: string;
    amount: number;
    transactionId: string | null;
    /** Manual proof submitted at checkout (txnId / bank account details). */
    metaData: Record<string, unknown> | null;
    paidAt: string | null;
  }[];
  returns: {
    id: number;
    returnNumber: string;
    status: string;
    reason: string;
    refundAmount: number;
    refundMethod: string | null;
    media: string[];
    createdAt: string;
    items: { orderItemId: number; quantity: number; reason: string | null }[];
  }[];
  canCancel: boolean;
  canReturn: boolean;
  returnReason?: string;
  returnWindowEnds: string | null;
}

export const orderApi = {
  list: (api: CustomerApiClient, page = 0, size = 10) =>
    api.get<{
      data: OrderSummary[];
      pagination: { hasNext: boolean; totalItems: number };
    }>(`/v1/user/order?page=${page}&size=${size}`),
  detail: (api: CustomerApiClient, id: number) =>
    api.get<OrderDetail>(`/v1/user/order/${id}`),
  cancel: (api: CustomerApiClient, id: number, reason?: string) =>
    api.post<OrderDetail>(`/v1/user/order/${id}/cancel`, { reason }),
  requestReturn: (
    api: CustomerApiClient,
    id: number,
    body: {
      reason: string;
      items: { orderItemId: number; quantity: number; reason?: string }[];
      media?: string[];
    },
  ) =>
    api.post<{ id: number; returnNumber: string }>(
      `/v1/user/order/${id}/return`,
      body,
    ),
  uploadReturnPhoto: async (token: string, file: File) => {
    // FormData needs its own multipart content type, so this one bypasses the
    // JSON api client and goes straight to fetch.
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/v1/user/order/return/upload-image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) throw new Error("Could not upload the photo");
    return (await res.json()) as { url: string; path: string };
  },
};
