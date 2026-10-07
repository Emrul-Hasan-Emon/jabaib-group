import { CountryForm } from '@/components/admin/CountryForm';

export default async function EditCountryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CountryForm countryId={Number(id)} />;
}