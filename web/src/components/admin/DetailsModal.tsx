'use client';

export function DetailsModal({
  open,
  title,
  rows,
  onClose,
}: {
  open: boolean;
  title: string;
  rows: { label: string; value: React.ReactNode }[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        <dl className="divide-y divide-border text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="text-right font-medium">{r.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-md border border-border px-4 py-2 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
