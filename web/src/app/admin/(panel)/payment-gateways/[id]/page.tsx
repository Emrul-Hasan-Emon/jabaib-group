import { PaymentGatewayForm } from "@/components/admin/PaymentGatewayForm";

export default async function EditPaymentGatewayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentGatewayForm gatewayId={Number(id)} />;
}
