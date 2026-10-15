"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin-auth";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface Gateway {
  id: number;
  name: string;
  nameBN: string;
  slug: string;
  type: "mfs" | "bank";
  isManual: boolean;
  provider: string | null;
  description: string | null;
  iconUrl: string | null;
  iconPath: string | null;
  isActive: boolean;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
  branchName: string | null;
}

const EMPTY = {
  name: "",
  nameBN: "",
  type: "mfs" as "mfs" | "bank",
  isManual: true,
  provider: "",
  description: "",
  iconUrl: "",
  iconPath: "",
  isActive: true,
  accountName: "",
  accountNumber: "",
  bankName: "",
  branchName: "",
};

/**
 * Create/edit form for a payment gateway.
 *
 * Which fields are required follows the same rules the API enforces, so the
 * admin sees the requirement before submitting: a manual MFS gateway needs an
 * account name and number, a manual bank gateway also needs bank and branch,
 * and an automated gateway must be bound to an existing provider.
 */
export function PaymentGatewayForm({ gatewayId }: { gatewayId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!gatewayId);

  const set = <K extends keyof typeof EMPTY>(
    key: K,
    value: (typeof EMPTY)[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const load = useCallback(async () => {
    const res = await api.get<Gateway>(
      `/v1/admin/payment-gateway/${gatewayId}`,
    );
    setForm({
      name: res.name,
      nameBN: res.nameBN,
      type: res.type,
      isManual: res.isManual,
      provider: res.provider ?? "",
      description: res.description ?? "",
      iconUrl: res.iconUrl ?? "",
      iconPath: res.iconPath ?? "",
      isActive: res.isActive,
      accountName: res.accountName ?? "",
      accountNumber: res.accountNumber ?? "",
      bankName: res.bankName ?? "",
      branchName: res.branchName ?? "",
    });
    setLoaded(true);
  }, [api, gatewayId]);

  useEffect(() => {
    if (!gatewayId) return;
    load().catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load gateway"),
    );
  }, [gatewayId, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Only send the fields that apply, so switching type/manual never leaves
      // stale account details behind on an automated gateway.
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        nameBN: form.nameBN.trim(),
        type: form.type,
        isManual: form.isManual,
        isActive: form.isActive,
        description: form.description,
        iconUrl: form.iconUrl || undefined,
        iconPath: form.iconPath || undefined,
      };
      if (form.isManual) {
        payload.accountName = form.accountName.trim();
        payload.accountNumber = form.accountNumber.trim();
        if (form.type === "bank") {
          payload.bankName = form.bankName.trim();
          payload.branchName = form.branchName.trim();
        }
      } else {
        payload.provider = form.provider;
      }

      if (gatewayId) {
        await api.patch(`/v1/admin/payment-gateway/${gatewayId}`, payload);
      } else {
        await api.post("/v1/admin/payment-gateway", payload);
      }
      router.push("/admin/payment-gateways");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeIcon = async () => {
    if (!gatewayId) {
      set("iconUrl", "");
      set("iconPath", "");
      return;
    }
    try {
      await api.del(`/v1/admin/payment-gateway/${gatewayId}/icon`);
      set("iconUrl", "");
      set("iconPath", "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove icon");
    }
  };

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const input =
    "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring";

  return (
    <form onSubmit={submit} className="max-w-3xl">
      <Link
        href="/admin/payment-gateways"
        className="text-sm text-muted-foreground"
      >
        ← Back
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">
        {gatewayId ? "Edit payment gateway" : "New payment gateway"}
      </h1>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          Name (EN) <span className="text-destructive">*</span>
          <input
            required
            className={input}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="bKash"
          />
        </label>
        <label className="text-sm">
          Name (BN) <span className="text-destructive">*</span>
          <input
            required
            className={input}
            value={form.nameBN}
            onChange={(e) => set("nameBN", e.target.value)}
            placeholder="বিকাশ"
          />
        </label>

        <label className="text-sm">
          Type <span className="text-destructive">*</span>
          <select
            className={input}
            value={form.type}
            onChange={(e) => set("type", e.target.value as "mfs" | "bank")}
          >
            <option value="mfs">MFS (mobile financial service)</option>
            <option value="bank">Bank transfer</option>
          </select>
        </label>

        <div className="flex items-end gap-6 pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isManual}
              onChange={(e) => set("isManual", e.target.checked)}
            />
            Manual payment
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
            />
            Active
          </label>
        </div>
      </div>

      <p className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        {form.isManual
          ? "The customer pays this account themselves and submits the reference. No gateway redirect is used."
          : "Settled automatically through the existing payment provider callback."}
      </p>

      {form.isManual ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            Account name <span className="text-destructive">*</span>
            <input
              required
              className={input}
              value={form.accountName}
              onChange={(e) => set("accountName", e.target.value)}
              placeholder="Jabaib Fashion Ltd."
            />
          </label>
          <label className="text-sm">
            Account number <span className="text-destructive">*</span>
            <input
              required
              className={input}
              value={form.accountNumber}
              onChange={(e) => set("accountNumber", e.target.value)}
              placeholder="01700000000"
            />
          </label>
          {form.type === "bank" && (
            <>
              <label className="text-sm">
                Bank name <span className="text-destructive">*</span>
                <input
                  required
                  className={input}
                  value={form.bankName}
                  onChange={(e) => set("bankName", e.target.value)}
                  placeholder="Dutch-Bangla Bank"
                />
              </label>
              <label className="text-sm">
                Branch name <span className="text-destructive">*</span>
                <input
                  required
                  className={input}
                  value={form.branchName}
                  onChange={(e) => set("branchName", e.target.value)}
                  placeholder="Dhanmondi Branch"
                />
              </label>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <label className="text-sm">
            Provider <span className="text-destructive">*</span>
            <select
              required
              className={input}
              value={form.provider}
              onChange={(e) => set("provider", e.target.value)}
            >
              <option value="">Select a provider…</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="card">Card</option>
            </select>
          </label>
          <p className="mt-1.5 text-xs text-muted-foreground">
            The gateway is recorded under this provider, so existing
            gateway-callback settlement keeps working.
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-4">
        <RichTextEditor
          label="Customer instructions"
          value={form.description}
          onChange={(html) => set("description", html)}
          placeholder="e.g. Send the total to 01700000000 and put your order number in the reference."
        />

        <div>
          <ImageUploadField
            label="Icon"
            feature="paymentGateway"
            value={form.iconUrl}
            onChange={(url, path) => {
              set("iconUrl", url);
              set("iconPath", path);
            }}
            hint="Square PNG/JPG works best — shown beside the option at checkout."
          />
          {form.iconUrl && (
            <button
              type="button"
              onClick={removeIcon}
              className="mt-2 text-xs font-medium text-red-600 hover:underline"
            >
              Remove icon
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save gateway"}
        </button>
        <Link
          href="/admin/payment-gateways"
          className="text-sm text-muted-foreground hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
