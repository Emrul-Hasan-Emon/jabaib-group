"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/lib/admin-auth";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DetailsModal } from "@/components/admin/DetailsModal";

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
  isActive: boolean;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
  branchName: string | null;
}

export default function PaymentGatewaysPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Gateway[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mfs" | "bank">("all");
  const [deleteTarget, setDeleteTarget] = useState<Gateway | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Gateway | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: "0", size: "100" });
    if (filter !== "all") params.set("type", filter);
    const res = await api.get<{ data: Gateway[] }>(
      `/v1/admin/payment-gateway?${params}`,
    );
    setRows(res.data);
  }, [api, filter]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const toggleActive = async (row: Gateway) => {
    try {
      await api.patch(`/v1/admin/payment-gateway/${row.id}`, {
        isActive: !row.isActive,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/payment-gateway/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment Gateways</h1>
        <Link
          href="/admin/payment-gateways/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Add gateway
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Options shown at checkout. Manual gateways collect the payment reference
        or bank details from the customer; automated ones settle through an
        existing provider. Only active gateways are offered to customers.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "mfs", "bank"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground"
            }`}
          >
            {value === "all" ? "All" : value.toUpperCase()}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Gateway</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Mode</th>
              <th className="px-4 py-2">Account</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <span className="flex items-center gap-2">
                    {row.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.iconUrl}
                        alt=""
                        className="h-6 w-6 rounded object-cover"
                      />
                    ) : null}
                    <span>
                      <span className="block font-medium">{row.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {row.nameBN} · <code>{row.slug}</code>
                      </span>
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2 uppercase">{row.type}</td>
                <td className="px-4 py-2">
                  {row.isManual ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Manual
                    </span>
                  ) : (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
                      Auto · {row.provider ?? "unset"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {row.isManual
                    ? [row.accountNumber, row.bankName, row.branchName]
                        .filter(Boolean)
                        .join(" · ") || "—"
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(row)}
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      row.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {row.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setDetailsTarget(row)}
                      className="text-primary hover:underline"
                    >
                      Details
                    </button>
                    <Link
                      href={`/admin/payment-gateways/${row.id}`}
                      className="text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(row)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No payment gateways yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete payment gateway"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? Customers will no longer see it at checkout. Past orders keep their record.`
            : ""
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />

      <DetailsModal
        open={Boolean(detailsTarget)}
        title={detailsTarget?.name ?? ""}
        onClose={() => setDetailsTarget(null)}
        rows={
          detailsTarget
            ? [
                { label: "Name (EN)", value: detailsTarget.name },
                { label: "Name (BN)", value: detailsTarget.nameBN },
                { label: "Slug (generated)", value: detailsTarget.slug },
                { label: "Type", value: detailsTarget.type.toUpperCase() },
                {
                  label: "Mode",
                  value: detailsTarget.isManual
                    ? "Manual"
                    : `Automated · ${detailsTarget.provider ?? "unset"}`,
                },
                ...(detailsTarget.isManual
                  ? [
                      {
                        label: "Account name",
                        value: detailsTarget.accountName ?? "—",
                      },
                      {
                        label: "Account number",
                        value: detailsTarget.accountNumber ?? "—",
                      },
                      ...(detailsTarget.type === "bank"
                        ? [
                            {
                              label: "Bank",
                              value: detailsTarget.bankName ?? "—",
                            },
                            {
                              label: "Branch",
                              value: detailsTarget.branchName ?? "—",
                            },
                          ]
                        : []),
                    ]
                  : []),
                {
                  label: "Active",
                  value: detailsTarget.isActive ? "Yes" : "No",
                },
                {
                  label: "Customer fields",
                  value:
                    detailsTarget.type === "bank"
                      ? "Account name, account number, bank, branch"
                      : "Transaction ID",
                },
              ]
            : []
        }
      />
    </div>
  );
}
