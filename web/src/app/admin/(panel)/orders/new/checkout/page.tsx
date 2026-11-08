'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';
import { storefront, type LocationCountry } from '@/lib/storefront';
import { paymentGatewayApi, type PaymentGatewayOption } from '@/lib/commerce-api';
import {
  adminCustomerApi,
  adminOrderApi,
  adminOrderDraft,
  type AdminCartLine,
  type AdminCustomerAddress,
  type AdminOrderCustomer,
} from '@/lib/admin-order-api';

const COD_SLUG = 'cash-on-delivery';
const DELIVERY_TYPES = [
  { value: 'inside_dhaka' as const, label: 'Inside Dhaka' },
  { value: 'outside_dhaka' as const, label: 'Outside Dhaka' },
];

export default function CreateOrderCheckoutPage() {
  const { api } = useAdminAuth();
  const router = useRouter();

  const [customer, setCustomer] = useState<AdminOrderCustomer | null>(null);
  const [cart, setCart] = useState<AdminCartLine[]>([]);

  const [addresses, setAddresses] = useState<AdminCustomerAddress[]>([]);
  const [addressMode, setAddressMode] = useState<'saved' | 'new'>('saved');
  const [addressId, setAddressId] = useState<number | null>(null);
  const [inline, setInline] = useState({
    recipientName: '',
    phone: '',
    address: '',
    divisionId: '' as number | '',
    districtId: '' as number | '',
    zipCode: '',
  });
  const [saveAddress, setSaveAddress] = useState(false);
  const [locations, setLocations] = useState<LocationCountry[]>([]);

  const [deliveryType, setDeliveryType] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [note, setNote] = useState('');

  const [gateway, setGateway] = useState<PaymentGatewayOption | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = adminOrderDraft.getCustomer();
    const lines = adminOrderDraft.getCart();
    if (!c || lines.length === 0) {
      router.replace(c ? '/admin/orders/new/products' : '/admin/orders/new');
      return;
    }
    setCustomer(c);
    setCart(lines);

    adminCustomerApi.detail(api, c.id).then((detail) => {
      setAddresses(detail.addresses);
      const preferred = detail.addresses.find((a) => a.isDefault) ?? detail.addresses[0];
      if (preferred) setAddressId(preferred.id);
      setAddressMode(detail.addresses.length ? 'saved' : 'new');
    }).catch(() => {});

    storefront.locationTree().then(setLocations).catch(() => setLocations([]));

    paymentGatewayApi.listActive(api).then((rows) => {
      setGateway(rows.find((g) => g.slug === COD_SLUG) ?? null);
    }).catch(() => setGateway(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const divisions = locations.flatMap((c) => c.divisions ?? []);
  const districts = divisions.find((d) => d.id === inline.divisionId)?.districts ?? [];

  const total = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);

  const addressReady =
    addressMode === 'saved'
      ? addressId != null
      : Boolean(inline.recipientName.trim() && inline.phone.trim() && inline.address.trim());

  const placeOrder = async () => {
    if (!customer || !gateway) return;
    setError(null);
    setPlacing(true);
    try {
      let finalAddressId: number | undefined;
      let inlineFields: {
        recipientName?: string;
        phone?: string;
        address?: string;
        divisionId?: number;
        districtId?: number;
        zipCode?: string;
      } = {};

      if (addressMode === 'saved' && addressId) {
        finalAddressId = addressId;
      } else {
        const body = {
          recipientName: inline.recipientName.trim(),
          phone: inline.phone.trim(),
          address: inline.address.trim(),
          divisionId: inline.divisionId === '' ? undefined : inline.divisionId,
          districtId: inline.districtId === '' ? undefined : inline.districtId,
          zipCode: inline.zipCode.trim() || undefined,
        };
        if (saveAddress) {
          const created = await adminCustomerApi.createAddress(api, customer.id, body);
          finalAddressId = created.id;
        } else {
          inlineFields = body;
        }
      }

      const res = await adminOrderApi.create(api, {
        userId: customer.id,
        items: cart.map((l) => ({ productId: l.productId, productSKUId: l.productSKUId, quantity: l.quantity })),
        ...(finalAddressId ? { addressId: finalAddressId } : inlineFields),
        deliveryType,
        paymentGatewayId: gateway.id,
        note: note.trim() || undefined,
      });

      adminOrderDraft.clear();
      router.push(`/admin/orders/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place the order');
    } finally {
      setPlacing(false);
    }
  };

  if (!customer) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create order</h1>
          <p className="text-sm text-muted-foreground">
            For <span className="font-semibold text-foreground">{customer.name}</span>
            {' '}· <Link href="/admin/orders/new/products" className="text-primary">Back to products</Link>
          </p>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">Delivery address</h2>

            {addresses.length > 0 && (
              <div className="mb-3 flex gap-2">
                {(['saved', 'new'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAddressMode(mode)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${addressMode === mode ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}
                  >
                    {mode === 'saved' ? 'Saved address' : 'New address'}
                  </button>
                ))}
              </div>
            )}

            {addressMode === 'saved' && addresses.length > 0 ? (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm ${addressId === a.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <input type="radio" name="address" className="mt-1" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                    <span>
                      <span className="block font-semibold">{a.recipientName}{a.isDefault ? ' (Default)' : ''}</span>
                      <span className="block text-muted-foreground">{a.phone} · {a.address}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name" value={inline.recipientName} onChange={(v) => setInline({ ...inline, recipientName: v })} />
                <Field label="Phone" value={inline.phone} onChange={(v) => setInline({ ...inline, phone: v })} />
                <div className="sm:col-span-2">
                  <Field label="Address" value={inline.address} onChange={(v) => setInline({ ...inline, address: v })} />
                </div>
                <Select label="Division" value={inline.divisionId} onChange={(v) => setInline({ ...inline, divisionId: v, districtId: '' })} options={divisions.map((d) => ({ value: d.id, label: d.name }))} />
                <Select label="District" value={inline.districtId} onChange={(v) => setInline({ ...inline, districtId: v })} options={districts.map((d) => ({ value: d.id, label: d.name }))} disabled={inline.divisionId === ''} />
                <Field label="Postal code" value={inline.zipCode} onChange={(v) => setInline({ ...inline, zipCode: v })} />
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                  Save this address for future orders
                </label>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">Delivery</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {DELIVERY_TYPES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDeliveryType(d.value)}
                  className={`rounded-lg border p-3 text-left text-sm font-semibold ${deliveryType === d.value ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">Payment</h2>
            {gateway ? (
              <div className="rounded-lg border border-primary bg-primary/5 p-3 text-sm font-semibold">{gateway.name}</div>
            ) : (
              <p className="text-sm text-muted-foreground">No Cash on Delivery gateway is configured.</p>
            )}
            <div className="mt-3">
              <Field label="Order note (optional)" value={note} onChange={setNote} />
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-4">
          <h2 className="mb-3 font-semibold">Order summary</h2>
          <ul className="space-y-1.5 text-sm">
            {cart.map((l) => (
              <li key={l.productSKUId} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">{l.name}{l.skuLabel ? ` (${l.skuLabel})` : ''} × {l.quantity}</span>
                <span className="font-semibold">৳{l.price * l.quantity}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-bold">
            <span>Estimated total</span>
            <span>৳{total}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Final total (with delivery charge) is calculated when the order is placed.</p>

          <button
            onClick={placeOrder}
            disabled={placing || !addressReady || !gateway}
            className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {placing ? 'Placing order…' : 'Place order'}
          </button>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm" />
    </label>
  );
}

function Select({ label, value, onChange, options, disabled }: { label: string; value: number | ''; onChange: (v: number) => void; options: { value: number; label: string }[]; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-md border border-input px-3 py-2 text-sm disabled:opacity-50">
        <option value="">—</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
