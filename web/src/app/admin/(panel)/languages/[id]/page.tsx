import { LanguageForm } from '@/components/admin/LanguageForm';

export default async function EditLanguagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LanguageForm languageId={Number(id)} />;
}