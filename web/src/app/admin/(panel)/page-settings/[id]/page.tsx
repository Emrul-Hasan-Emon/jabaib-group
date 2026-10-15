import { PageSettingForm } from '@/components/admin/PageSettingForm';

export default async function EditPageSettingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PageSettingForm pageId={Number(id)} />;
}