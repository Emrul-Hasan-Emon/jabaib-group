import { HomepageSectionForm } from '@/components/admin/HomepageSectionForm';

export default async function EditHomepageSectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HomepageSectionForm sectionId={Number(id)} />;
}