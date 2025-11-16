'use client';

import { useState } from 'react';
import { cartApi } from '@/lib/api/cart';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface AddToCartButtonProps {
  productId: string;
  variantId?: string;
  quantity?: number;
}

export default function AddToCartButton({
  productId,
  variantId,
  quantity = 1,
}: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await cartApi.addToCart({
        productId,
        variantId,
        quantity,
      });

      if (response.success) {
        setMessage('Produkt přidán do košíku');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Nepodařilo se přidat produkt do košíku');
      }
    } catch {
      setMessage('Došlo k chybě');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleAddToCart}
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {loading ? 'Přidávání...' : '🛒 Přidat do košíku'}
      </button>
      {message && (
        <div className={`mt-3 p-3 rounded-xl font-semibold text-sm ${
          message.includes('přidán') 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 text-green-700' 
            : 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
