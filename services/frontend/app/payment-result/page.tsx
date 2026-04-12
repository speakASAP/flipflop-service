'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function PaymentResultContent() {
  const params = useSearchParams();
  const router = useRouter();

  const status = params.get('status'); // 'completed' | 'cancelled' | 'failed'
  const orderId = params.get('orderId');

  if (status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="max-w-lg w-full mx-4 bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="text-8xl mb-6">✅</div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Platba proběhla úspěšně!</h1>
          <p className="text-xl text-gray-600 mb-8">
            Vaše objednávka byla potvrzena. Potvrzení vám zašleme na e-mail.
          </p>
          {orderId && (
            <Link
              href={`/orders/${orderId}`}
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg mb-4"
            >
              Zobrazit objednávku
            </Link>
          )}
          <div>
            <Link href="/products" className="text-blue-600 hover:text-blue-700 font-semibold">
              Pokračovat v nákupu →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="max-w-lg w-full mx-4 bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="text-8xl mb-6">❌</div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Platba zrušena</h1>
          <p className="text-xl text-gray-600 mb-8">
            Platbu jste zrušili. Vaše objednávka nebyla potvrzena.
          </p>
          <button
            onClick={() => router.push('/checkout')}
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg mb-4 cursor-pointer"
          >
            Zkusit znovu
          </button>
          <div>
            <Link href="/orders" className="text-blue-600 hover:text-blue-700 font-semibold">
              Moje objednávky →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
      <div className="max-w-lg w-full mx-4 bg-white rounded-2xl shadow-xl p-12 text-center">
        <div className="text-8xl mb-6">⚠️</div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Platba se nezdařila</h1>
        <p className="text-xl text-gray-600 mb-8">
          Při zpracování platby došlo k chybě. Vaše karta nebyla zatížena.
        </p>
        <button
          onClick={() => router.push('/checkout')}
          className="inline-block bg-gradient-to-r from-red-500 to-pink-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-red-600 hover:to-pink-700 transition-all shadow-lg mb-4 cursor-pointer"
        >
          Zkusit znovu
        </button>
        <div>
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
            Zpět na hlavní stránku →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-6xl animate-pulse">⏳</div>
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}
