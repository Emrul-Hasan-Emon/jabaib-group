import { AdminUserForm } from '@/components/admin/AdminUserForm';

export default async function EditAdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminUserForm adminUserId={Number(id)} />;
}