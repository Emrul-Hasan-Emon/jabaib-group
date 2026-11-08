import type { CustomerApiClient } from "./customer-api";

/** Admin-side customer search/detail + address creation (for placing an order on a customer's behalf). */

export interface AdminCustomerSearchRow {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  orderCount: number;
  wishlistCount: number;
}

export interface AdminCustomerAddress {
  id: number;
  recipientName: string;
  phone: string;
  address: string;
  divisionId?: number;
  districtId?: number;
  zipCode?: string;
  isDefault: boolean;
  division?: { name: string } | null;
  district?: { name: string } | null;
}

export interface AdminCustomerDetail {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  addresses: AdminCustomerAddress[];
}

export const adminCustomerApi = {
  search: (api: CustomerApiClient, q: string) =>
    api.get<{ data: AdminCustomerSearchRow[] }>(
      `/v1/admin/customer?q=${encodeURIComponent(q)}&page=0&size=10`,
    ),
  detail: (api: CustomerApiClient, id: number) =>
    api.get<AdminCustomerDetail>(`/v1/admin/customer/${id}`),
  createAddress: (
    api: CustomerApiClient,
    customerId: number,
    body: {
      recipientName: string;
      phone: string;
      address: string;
      divisionId?: number;
      districtId?: number;
      zipCode?: string;
      isDefault?: boolean;
    },
  ) =>
    api.post<AdminCustomerAddress>(
      `/v1/admin/customer/${customerId}/address`,
      body,
    ),
};

/** Admin product browse (reuses the existing admin product CRUD list/detail endpoints). */

export interface AdminProductRow {
  id: number;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
  category?: { id: number; name: string } | null;
  collection?: { id: number; name: string } | null;
}

export interface AdminProductSKU {
  id: number;
  sku: string;
  price: number;
  discountedPrice: number | null;
  quantity: number;
  isActive: boolean;
  isDefault: boolean;
  skuVariants: {
    attribute: { name: string };
    attributeValue: { name: string };
  }[];
}

export interface AdminProductDetail extends AdminProductRow {
  skus: AdminProductSKU[];
}

export const adminProductBrowseApi = {
  list: (api: CustomerApiClient, params: URLSearchParams) =>
    api.get<{
      data: AdminProductRow[];
      pagination: { totalItems: number; hasNext: boolean };
    }>(`/v1/admin/product?${params}`),
  detail: (api: CustomerApiClient, id: number) =>
    api.get<AdminProductDetail>(`/v1/admin/product/${id}`),
};

/** Admin-placed order. */

export interface CreateAdminOrderPayload {
  userId: number;
  items: { productId: number; productSKUId: number; quantity: number }[];
  addressId?: number;
  recipientName?: string;
  phone?: string;
  address?: string;
  divisionId?: number;
  districtId?: number;
  zipCode?: string;
  deliveryType: "inside_dhaka" | "outside_dhaka";
  paymentGatewayId?: number;
  note?: string;
}

export const adminOrderApi = {
  create: (api: CustomerApiClient, body: CreateAdminOrderPayload) =>
    api.post<{ id: number }>("/v1/admin/order", body),
};

/** The admin-side cart: kept in localStorage since there's no server cart for admin-placed orders. */

export interface AdminCartLine {
  productId: number;
  productSKUId: number;
  name: string;
  skuLabel: string;
  sku: string;
  price: number;
  quantity: number;
  image: string | null;
  maxQuantity: number;
}

export interface AdminOrderCustomer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

const CUSTOMER_KEY = "adminOrderCustomer";
const CART_KEY = "adminOrderCart";

export const adminOrderDraft = {
  getCustomer(): AdminOrderCustomer | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(CUSTOMER_KEY);
      return raw ? (JSON.parse(raw) as AdminOrderCustomer) : null;
    } catch {
      return null;
    }
  },
  setCustomer(customer: AdminOrderCustomer) {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  },
  getCart(): AdminCartLine[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as AdminCartLine[]) : [];
    } catch {
      return [];
    }
  },
  setCart(lines: AdminCartLine[]) {
    localStorage.setItem(CART_KEY, JSON.stringify(lines));
  },
  clear() {
    localStorage.removeItem(CUSTOMER_KEY);
    localStorage.removeItem(CART_KEY);
  },
};
