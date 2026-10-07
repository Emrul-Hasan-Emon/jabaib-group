import { CouponForm } from '@/components/admin/CouponForm';

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CouponForm couponId={Number(id)} />;
}