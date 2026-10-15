import { BannerForm } from '@/components/admin/BannerForm';

export default async function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BannerForm bannerId={Number(id)} />;
}