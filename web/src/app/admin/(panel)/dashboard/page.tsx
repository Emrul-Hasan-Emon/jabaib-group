import { Package, ShoppingCart, Users, Banknote } from 'lucide-react';

export default function AdminDashboardPage() {
  const cards = [
    { label: 'Products', value: '—', icon: Package, tint: 'bg-primary/10 text-primary' },
    { label: 'Orders', value: '—', icon: ShoppingCart, tint: 'bg-badge-orange/10 text-badge-orange' },
    { label: 'Customers', value: '—', icon: Users, tint: 'bg-sky-100 text-sky-600' },
    { label: 'Revenue (BDT)', value: '—', icon: Banknote, tint: 'bg-emerald-100 text-emerald-600' },
  ];
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Overview of your store today.
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className={`mb-3 inline-flex rounded-lg p-2 ${c.tint}`}>
              <c.icon size={18} />
            </div>
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Stats will be wired to real counts in later phases.
      </p>
    </div>
  );
}
