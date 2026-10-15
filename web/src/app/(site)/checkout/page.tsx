"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  MapPin,
  Tag,
  CreditCard,
  AlertCircle,
  Check,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { useLocale } from "@/lib/locale";
import { useUserAuth } from "@/lib/user-auth";
import { useCart } from "@/lib/cart";
import { storefront, type LocationCountry } from "@/lib/storefront";
import {
  addressApi,
  checkoutApi,
  couponApi,
  paymentGatewayApi,
  type CheckoutPayload,
  type CheckoutPreview,
  type CouponCheck,
  type PaymentGatewayOption,
  type SavedAddress,
} from "@/lib/commerce-api";
import { formatTaka, mediaUrl } from "@/lib/media-url";
import { UserGuard } from "@/components/user/UserGuard";

const DELIVERY_TYPES = [
  { value: "inside_dhaka", label: "Inside Dhaka", hint: "Usually 2 days" },
  { value: "outside_dhaka", label: "Outside Dhaka", hint: "Usually 5 days" },
] as const;

/**
 * Cash on delivery stays a built-in option; everything else comes from the
 * payment gateways an admin has activated, so the storefront never hardcodes a
 * provider list.
 */
const COD_OPTION = {
  value: "cod" as const,
  label: "Cash on delivery",
  hint: "Pay when your order arrives",
};

/**
 * Checkout: pick (or type) an address, choose delivery + payment, apply a
 * coupon, then place the order. Every total comes from the server preview so
 * the customer never sees a number the API would not honour.
 */
export default function CheckoutPage() {
  return (
    <UserGuard>
      <CheckoutForm />
    </UserGuard>
  );
}

function CheckoutForm() {
  const { t, locale } = useLocale();
  const { api, status } = useUserAuth();
  const { lines, clear, closeDrawer } = useCart();
  const router = useRouter();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressMode, setAddressMode] = useState<"saved" | "new">("saved");
  const [addressId, setAddressId] = useState<number | null>(null);
  const [inline, setInline] = useState({
    recipientName: "",
    phone: "",
    address: "",
    divisionId: "" as number | "",
    districtId: "" as number | "",
    zipCode: "",
  });
  const [locations, setLocations] = useState<LocationCountry[]>([]);
  const [deliveryType, setDeliveryType] =
    useState<CheckoutPayload["deliveryType"]>("inside_dhaka");
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");

  // Payment gateways configured by an admin (active ones only). Choosing one
  // overrides the built-in method; the server decides what that means.
  const [gateways, setGateways] = useState<PaymentGatewayOption[]>([]);
  const [gatewayId, setGatewayId] = useState<number | null>(null);
  const [gatewayMeta, setGatewayMeta] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string>("");
  const [couponResult, setCouponResult] = useState<CouponCheck | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const authed = status === "authed";

  useEffect(() => {
    if (!authed) return;
    addressApi
      .list(api)
      .then((rows) => {
        setAddresses(rows);
        const preferred = rows.find((r) => r.isDefault) ?? rows[0];
        if (preferred) setAddressId(preferred.id);
        setAddressMode(rows.length ? "saved" : "new");
      })
      .catch(() => setAddressMode("new"));
    storefront
      .locationTree()
      .then(setLocations)
      .catch(() => setLocations([]));
    paymentGatewayApi
      .listActive(api)
      .then(setGateways)
      .catch(() => setGateways([]));
  }, [authed, api]);

  const selectedGateway = gateways.find((g) => g.id === gatewayId) ?? null;

  /** Switching option clears the previous gateway's proof fields. */
  const chooseCod = () => {
    setGatewayId(null);
    setGatewayMeta({});
    setTransactionId("");
  };

  const chooseGateway = (id: number) => {
    setGatewayId(id);
    setGatewayMeta({});
    setTransactionId("");
  };

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  const payload = useMemo<CheckoutPayload>(() => {
    const base: CheckoutPayload = {
      deliveryType,
      paymentMethod: COD_OPTION.value,
      note: note.trim() || undefined,
      couponCode: appliedCoupon || undefined,
      transactionId: transactionId.trim() || undefined,
      ...(selectedGateway
        ? {
            paymentGatewayId: selectedGateway.id,
            paymentMetaData: gatewayMeta,
          }
        : {}),
    };
    if (addressMode === "saved" && addressId) return { ...base, addressId };
    return {
      ...base,
      recipientName: inline.recipientName.trim(),
      phone: inline.phone.trim(),
      address: inline.address.trim(),
      divisionId: inline.divisionId === "" ? undefined : inline.divisionId,
      districtId: inline.districtId === "" ? undefined : inline.districtId,
      zipCode: inline.zipCode.trim() || undefined,
    };
  }, [
    addressMode,
    addressId,
    inline,
    deliveryType,
    note,
    appliedCoupon,
    transactionId,
    selectedGateway,
    gatewayMeta,
  ]);

  /**
   * Checkout is submittable only once every field the chosen gateway asks for
   * is filled in — the server enforces the same rules.
   */
  const missingGatewayFields = (selectedGateway?.fields ?? []).filter(
    (f) => !gatewayMeta[f.key]?.trim(),
  );
  // COD needs nothing; a manual gateway needs its fields, an automated one the
  // reference the provider callback will confirm.
  const paymentReady = selectedGateway
    ? selectedGateway.isManual
      ? missingGatewayFields.length === 0
      : Boolean(transactionId.trim())
    : true;

  // A usable payload is what drives the live preview (server-computed totals).
  const payloadReady =
    lines.length > 0 &&
    (addressMode === "saved"
      ? addressId != null
      : Boolean(inline.recipientName && inline.phone && inline.address));

  useEffect(() => {
    if (!authed || !payloadReady) return;
    let alive = true;
    const timer = setTimeout(() => {
      checkoutApi
        .preview(api, payload)
        .then((res) => {
          if (!alive) return;
          setPreview(res);
          setPreviewError(null);
        })
        .catch((e: unknown) => {
          if (!alive) return;
          setPreview(null);
          setPreviewError(
            e instanceof Error ? e.message : "Could not load totals",
          );
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, payloadReady, JSON.stringify(payload)]);

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || !preview) return;
    setCouponBusy(true);
    try {
      const result = await couponApi.preview(
        api,
        code,
        preview.totals.subtotal,
      );
      setCouponResult(result);
      if (result.valid) setAppliedCoupon(result.code);
    } finally {
      setCouponBusy(false);
    }
  };

  const clearCoupon = () => {
    setAppliedCoupon("");
    setCouponResult(null);
    setCouponInput("");
  };

  const placeOrder = async () => {
    setPlaceError(null);
    setPlacing(true);
    try {
      const res = await checkoutApi.place(api, payload);
      await clear();
      closeDrawer();
      router.push(`/checkout/success?order=${res.id}`);
    } catch (e) {
      setPlaceError(
        e instanceof Error ? e.message : "Could not place the order",
      );
    } finally {
      setPlacing(false);
    }
  };

  const divisions = locations.flatMap((c) => c.divisions ?? []);
  const districts =
    divisions.find((d) => d.id === inline.divisionId)?.districts ?? [];

  if (!authed) {
    return (
      <div className="mx-auto max-w-md px-4 py-14 text-center sm:py-20">
        <h1 className="text-xl font-extrabold text-foreground">
          {t("Sign in to check out")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Your bag is saved — sign in to place the order.")}
        </p>
        <Link
          href="/user/login?next=/checkout"
          className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t("Sign in")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-3 sm:py-8">
      <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">
        {t("Checkout")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {locale === "bn"
          ? "ঠিকানা, ডেলিভারি ও পেমেন্ট নির্বাচন করুন"
          : "Choose an address, delivery and payment."}
      </p>

      {lines.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border bg-card px-6 py-10 text-center sm:mt-8 sm:py-16">
          <p className="font-semibold text-foreground">
            {t("Your bag is empty")}
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t("Start shopping")}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* steps */}
          <div className="space-y-3 sm:space-y-4">
            {/* address */}
            <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <MapPin size={15} className="text-primary" />{" "}
                {t("Delivery address")}
              </h2>

              {addresses.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {(
                    [
                      ["saved", t("Saved address")],
                      ["new", t("New address")],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setAddressMode(value)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        addressMode === value
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {addressMode === "saved" && addresses.length > 0 ? (
                <div className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2">
                  {addresses.map((a) => (
                    <label
                      key={a.id}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition sm:gap-3 sm:p-3 ${
                        addressId === a.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        className="mt-1 accent-primary"
                        checked={addressId === a.id}
                        onChange={() => setAddressId(a.id)}
                      />
                      <span className="min-w-0 text-sm">
                        <span className="block font-semibold text-foreground">
                          {a.recipientName}
                          {a.isDefault && (
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                              {t("Default")}
                            </span>
                          )}
                        </span>
                        <span className="block text-muted-foreground">
                          {a.phone} · {a.address}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-2 grid gap-2.5 sm:mt-3 sm:gap-3 sm:grid-cols-2">
                  <Field
                    label={t("Full name")}
                    value={inline.recipientName}
                    onChange={(v) => setInline({ ...inline, recipientName: v })}
                  />
                  <Field
                    label={t("Phone")}
                    value={inline.phone}
                    onChange={(v) => setInline({ ...inline, phone: v })}
                  />
                  <div className="sm:col-span-2">
                    <Field
                      label={t("Address")}
                      value={inline.address}
                      onChange={(v) => setInline({ ...inline, address: v })}
                    />
                  </div>
                  <Select
                    label={t("Division")}
                    value={inline.divisionId}
                    onChange={(v) =>
                      setInline({ ...inline, divisionId: v, districtId: "" })
                    }
                    options={divisions.map((d) => ({
                      value: d.id,
                      label: t(d.name, d.nameBN),
                    }))}
                  />
                  <Select
                    label={t("District")}
                    value={inline.districtId}
                    onChange={(v) => setInline({ ...inline, districtId: v })}
                    options={districts.map((d) => ({
                      value: d.id,
                      label: t(d.name, d.nameBN),
                    }))}
                    disabled={inline.divisionId === ""}
                  />
                  <Field
                    label={t("Postal code")}
                    value={inline.zipCode}
                    onChange={(v) => setInline({ ...inline, zipCode: v })}
                  />
                </div>
              )}
            </section>

            {/* delivery */}
            <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Truck size={15} className="text-primary" /> {t("Delivery")}
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {DELIVERY_TYPES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDeliveryType(d.value)}
                    className={`rounded-lg border p-3 text-left transition ${
                      deliveryType === d.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-foreground">
                      {d.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {d.hint}
                      {preview?.delivery.type === d.value &&
                      preview.delivery.charge > 0
                        ? ` · ${formatTaka(preview.delivery.charge)}`
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* payment */}
            <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <CreditCard size={15} className="text-primary" /> {t("Payment")}
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={chooseCod}
                  className={`rounded-lg border p-3 text-left transition ${
                    !selectedGateway
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="block text-sm font-semibold text-foreground">
                    {t(COD_OPTION.label)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t(COD_OPTION.hint)}
                  </span>
                </button>

                {gateways.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => chooseGateway(g.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      selectedGateway?.id === g.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {g.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaUrl(g.iconUrl)}
                          alt=""
                          className="h-5 w-5 rounded object-cover"
                        />
                      ) : null}
                      <span className="block text-sm font-semibold text-foreground">
                        {t(g.name, g.nameBN)}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {g.isManual
                        ? g.type === "bank"
                          ? t("Bank transfer — send from your bank")
                          : t("Mobile wallet — send from your MFS account")
                        : t("Verified automatically after payment")}
                    </span>
                  </button>
                ))}
              </div>

              {selectedGateway && (
                <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                  {selectedGateway.description && (
                    <div
                      className="rich-text text-sm text-foreground"
                      // Sanitized server-side to a small tag allow-list.
                      dangerouslySetInnerHTML={{
                        __html: selectedGateway.description,
                      }}
                    />
                  )}

                  {selectedGateway.isManual && (
                    <div className={selectedGateway.description ? "mt-3" : ""}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("Send your payment to")}
                      </p>
                      <dl className="mt-1.5 space-y-1 text-sm">
                        {(
                          [
                            ["Account name", selectedGateway.accountName],
                            ["Account number", selectedGateway.accountNumber],
                            ...(selectedGateway.type === "bank"
                              ? [
                                  ["Bank", selectedGateway.bankName],
                                  ["Branch", selectedGateway.branchName],
                                ]
                              : []),
                          ] as [string, string][]
                        )
                          .filter(([, value]) => Boolean(value))
                          .map(([label, value]) => (
                            <div
                              key={label}
                              className="flex items-center justify-between gap-2"
                            >
                              <dt className="text-muted-foreground">
                                {t(label)}
                              </dt>
                              <dd className="flex items-center gap-1.5 font-semibold text-foreground">
                                {value}
                                <button
                                  type="button"
                                  onClick={() => copy(label, value)}
                                  aria-label={t(`Copy ${label}`)}
                                  className="rounded p-0.5 text-muted-foreground transition hover:text-primary"
                                >
                                  {copied === label ? (
                                    <CheckCircle2
                                      size={13}
                                      className="text-emerald-600"
                                    />
                                  ) : (
                                    <Copy size={13} />
                                  )}
                                </button>
                              </dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  )}
                </div>
              )}

              {/* A manual gateway collects exactly the fields the server asked for. */}
              {selectedGateway?.isManual &&
                selectedGateway.fields.map((field) => (
                  <div key={field.key} className="mt-3">
                    <Field
                      label={t(field.label, field.labelBN)}
                      value={gatewayMeta[field.key] ?? ""}
                      onChange={(value) =>
                        setGatewayMeta((prev) => ({
                          ...prev,
                          [field.key]: value,
                        }))
                      }
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}

              {selectedGateway && !selectedGateway.isManual && (
                <div className="mt-3">
                  <Field
                    label={t("Transaction reference (TrxID)")}
                    value={transactionId}
                    onChange={setTransactionId}
                    placeholder="e.g. 9ABC123XYZ"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      "Pay using this method, then paste the reference — we verify it before shipping.",
                    )}
                  </p>
                </div>
              )}

              {selectedGateway?.isManual && missingGatewayFields.length > 0 && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle size={12} className="mt-px shrink-0" />
                  {t(
                    `Add the ${missingGatewayFields
                      .map((f) => t(f.label, f.labelBN))
                      .join(", ")} after paying so we can confirm your order.`,
                  )}
                </p>
              )}
              <div className="mt-3">
                <Field
                  label={t("Order note (optional)")}
                  value={note}
                  onChange={setNote}
                  placeholder={t("e.g. call before delivery")}
                />
              </div>
            </section>
          </div>

          {/* summary */}
          <aside className="h-fit rounded-xl border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-24">
            <h2 className="text-sm font-bold text-foreground">
              {t("Order summary")} (
              {preview ? preview.totals.itemCount : "\u2026"})
            </h2>

            <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1 sm:mt-3 sm:max-h-64 sm:space-y-2">
              {lines.map((line) => (
                <li key={line.key} className="flex items-center gap-3 text-sm">
                  <span className="h-10 w-8 shrink-0 overflow-hidden rounded bg-muted">
                    {line.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl(line.image)}
                        alt={line.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">
                      {line.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {line.skuLabel ? `${line.skuLabel} · ` : ""}× {line.qty}
                    </span>
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatTaka(line.unitPrice * line.qty)}
                  </span>
                </li>
              ))}
            </ul>

            {/* coupon */}
            <div className="mt-4 border-t border-border pt-4">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Tag size={13} /> {t("Coupon")}
              </label>
              {appliedCoupon ? (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Check size={14} /> {appliedCoupon}
                  </span>
                  <button onClick={clearCoupon} className="text-xs underline">
                    {t("Remove")}
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) =>
                      setCouponInput(e.target.value.toUpperCase())
                    }
                    placeholder="EID25"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm uppercase outline-none focus:border-primary"
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={couponBusy || !preview}
                    className="rounded-lg border border-primary px-3.5 text-sm font-semibold text-primary disabled:opacity-50"
                  >
                    {couponBusy ? "…" : t("Apply")}
                  </button>
                </div>
              )}
              {couponResult && !couponResult.valid && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
                  <AlertCircle size={12} className="mt-px shrink-0" />
                  {couponResult.message}
                </p>
              )}
              {couponResult?.valid && (
                <p className="mt-2 text-xs text-emerald-700">
                  {t("You saved")} {formatTaka(couponResult.discountAmount)}
                </p>
              )}
            </div>

            {/* totals */}
            <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-[13px] sm:mt-4 sm:pt-4 sm:text-sm">
              <Row
                label={t("Subtotal")}
                value={
                  preview ? formatTaka(preview.totals.listTotal) : "\u2014"
                }
              />
              {preview &&
                preview.totals.listTotal > preview.totals.subtotal && (
                  <Row
                    label={t("Item discounts")}
                    value={`− ${formatTaka(preview.totals.listTotal - preview.totals.subtotal)}`}
                    tone="badge-red"
                  />
                )}
              <Row
                label={t("Delivery")}
                value={
                  preview
                    ? preview.totals.deliveryCharge > 0
                      ? formatTaka(preview.totals.deliveryCharge)
                      : t("Free")
                    : "—"
                }
              />
              {preview && preview.totals.discountAmount > 0 && (
                <Row
                  label={t("Coupon discount")}
                  value={`− ${formatTaka(preview.totals.discountAmount)}`}
                  tone="badge-red"
                />
              )}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold text-foreground">
                  {t("Total")}
                </span>
                <span className="text-lg font-extrabold text-primary">
                  {preview ? formatTaka(preview.totals.total) : "—"}
                </span>
              </div>
            </div>

            {previewError && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle size={12} className="mt-px shrink-0" />
                {previewError}
              </p>
            )}
            {placeError && (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle size={12} className="mt-px shrink-0" />
                {placeError}
              </p>
            )}

            <button
              onClick={placeOrder}
              disabled={placing || !preview || !payloadReady || !paymentReady}
              className="mt-3.5 w-full rounded-full bg-primary py-2.5 text-[13px] font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-4 sm:py-3 sm:text-sm"
            >
              {placing ? t("Placing order…") : t("Place order")}
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {selectedGateway
                ? selectedGateway.isManual
                  ? t(
                      "Pay using the details above — we confirm the reference before shipping.",
                    )
                  : t("We verify your reference before shipping.")
                : t("Pay in cash when your order arrives.")}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "badge-red";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          tone === "badge-red"
            ? "font-semibold text-badge-red-foreground"
            : "text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: number | "";
  onChange: (value: number) => void;
  options: { value: number; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary disabled:opacity-50"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
