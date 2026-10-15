import { DivisionForm } from '@/components/admin/DivisionForm';

export default async function EditDivisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DivisionForm divisionId={Number(id)} />;
}