import { Suspense } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { CheckoutSuccessContent } from './CheckoutSuccessContent';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessFallback() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 size={52} className="text-emerald-600" />
      </div>
    </div>
  );
}
