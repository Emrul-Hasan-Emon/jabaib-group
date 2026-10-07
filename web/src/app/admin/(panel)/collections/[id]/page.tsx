import { CollectionForm } from '@/components/admin/CollectionForm';

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CollectionForm collectionId={Number(id)} />;
}