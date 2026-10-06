import { LabelForm } from '@/components/admin/LabelForm';

export default async function EditLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LabelForm labelId={Number(id)} />;
}
