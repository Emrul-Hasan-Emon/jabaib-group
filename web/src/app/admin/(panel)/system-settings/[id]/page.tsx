import { SystemSettingForm } from '@/components/admin/SystemSettingForm';

export default async function EditSystemSettingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SystemSettingForm settingId={Number(id)} />;
}