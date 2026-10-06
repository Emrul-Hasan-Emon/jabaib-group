import { AttributeForm } from '@/components/admin/AttributeForm';

export default async function EditAttributePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AttributeForm attributeId={Number(id)} />;
}
