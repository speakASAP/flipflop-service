'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { cartApi } from '@/lib/api/cart';
import { useAuth } from '@/contexts/AuthContext';
import { addGuestCartItem, GuestCartProduct, GuestCartVariant } from '@/lib/guest-cart';

type MessageTone = 'success' | 'warning' | 'error';
type ApiErrorLike = {
  message?: string;
  details?: {
    status?: number;
  };
};

interface AddToCartButtonProps {
  productId: string;
  product?: GuestCartProduct;
  variant?: GuestCartVariant;
  variantId?: string;
  quantity?: number;
  className?: string;
  label?: ReactNode;
  ariaLabel?: string;
  redirectTo?: string;
}

export default function AddToCartButton({
  productId,
  product,
  variant,
  variantId,
  quantity = 1,
  className,
  label = '🛒 Přidat do košíku',
  ariaLabel,
  redirectTo,
}: AddToCartButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('success');
  const { isAuthenticated, loading: authLoading } = useAuth();

  const showMessage = (nextMessage: string, tone: MessageTone = 'success') => {
    setMessageTone(tone);
    setMessage(nextMessage);
    setTimeout(() => setMessage(''), 3000);
  };

  const redirectAfterAdd = () => {
    if (redirectTo) {
      router.push(redirectTo);
    }
  };

  const availableStock = variant?.stockQuantity ?? product?.stockQuantity;
  const normalizedAvailableStock =
    typeof availableStock === 'number' && Number.isFinite(availableStock)
      ? Math.floor(availableStock)
      : undefined;

  const stockErrorMessage = (stock: number) => (
    stock <= 0 ? 'Produkt není skladem' : `Skladem je pouze ${stock} ks`
  );

  const getErrorStatus = (error?: ApiErrorLike) => error?.details?.status;

  const isAlreadyInCartError = (error?: ApiErrorLike) => (
    getErrorStatus(error) === 409 ||
    error?.message?.toLowerCase().includes('status code 409') ||
    error?.message?.toLowerCase().includes('already in your cart') ||
    error?.message?.toLowerCase().includes('already exists')
  );

  const isInsufficientStockError = (error?: ApiErrorLike) => (
    getErrorStatus(error) === 400 ||
    error?.message?.toLowerCase().includes('insufficient stock')
  );

  const handleAddToCart = async () => {
    setLoading(true);
    setMessage('');

    try {
      if (normalizedAvailableStock !== undefined && quantity > normalizedAvailableStock) {
        showMessage(stockErrorMessage(normalizedAvailableStock), 'error');
        return;
      }

      if (!isAuthenticated) {
        if (!product) {
          showMessage('Nepodařilo se připravit košík', 'error');
          return;
        }

        const result = addGuestCartItem({
          product,
          variant,
          quantity,
        });

        if (result.status === 'already-in-cart') {
          showMessage('Tento produkt už v košíku máte', 'warning');
          redirectAfterAdd();
        } else if (result.status === 'insufficient-stock') {
          showMessage(stockErrorMessage(result.availableStock || 0), 'error');
        } else {
          showMessage('Produkt přidán do košíku');
          redirectAfterAdd();
        }
        return;
      }

      const response = await cartApi.addToCart({
        productId,
        variantId: variant?.id || variantId,
        quantity,
      });

      if (response.success) {
        showMessage('Produkt přidán do košíku');
        redirectAfterAdd();
      } else if (isAlreadyInCartError(response.error)) {
        showMessage('Tento produkt už v košíku máte', 'warning');
        redirectAfterAdd();
      } else if (isInsufficientStockError(response.error)) {
        showMessage('Nelze přidat více kusů, než je skladem', 'error');
      } else {
        showMessage('Nepodařilo se přidat produkt do košíku', 'error');
      }
    } catch {
      showMessage('Došlo k chybě', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleAddToCart}
        disabled={loading || authLoading}
        aria-label={ariaLabel}
        className={className || 'w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'}
      >
        {loading ? 'Přidávání...' : label}
      </button>
      {message && (
        <div className={`mt-3 p-3 rounded-xl font-semibold text-sm ${
          messageTone === 'success'
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 text-green-700'
            : messageTone === 'warning'
              ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 text-amber-700'
            : 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
