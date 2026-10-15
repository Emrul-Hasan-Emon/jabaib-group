import { CategoryForm } from '@/components/admin/CategoryForm';

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CategoryForm categoryId={Number(id)} />;
}
