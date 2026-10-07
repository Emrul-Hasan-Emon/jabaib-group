import { ShippingZoneForm } from '@/components/admin/ShippingZoneForm';

export default async function EditShippingZonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShippingZoneForm zoneId={Number(id)} />;
}