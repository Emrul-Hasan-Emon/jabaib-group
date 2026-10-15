import { DistrictForm } from '@/components/admin/DistrictForm';

export default async function EditDistrictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DistrictForm districtId={Number(id)} />;
}