'use client';

import { useEffect, useState } from 'react';
import { cartApi, CartItem } from '@/lib/api/cart';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function CartPage() {
  const [cart, setCart] = useState<{ items: CartItem[]; total: number; itemCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadCart();
  }, [isAuthenticated]);

  const loadCart = async () => {
    try {
      const response = await cartApi.getCart();
      if (response.success && response.data) {
        setCart(response.data);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeItem(itemId);
      return;
    }

    try {
      await cartApi.updateCartItem(itemId, quantity);
      loadCart();
    } catch (error) {
      console.error('Failed to update cart item:', error);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await cartApi.removeFromCart(itemId);
      loadCart();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Načítání košíku...</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl shadow-xl p-12">
            <div className="text-8xl mb-6">🛒</div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Váš košík je prázdný</h1>
            <p className="text-xl text-gray-600 mb-8">Začněte nakupovat a přidejte produkty do košíku</p>
            <Link
              href="/products"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Prohlédnout produkty
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-slate-900">Košík</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => {
              const productImageUrl = item.product.mainImageUrl || 
                                     item.product.imageUrls?.[0] || 
                                     item.product.images?.[0] || 
                                     null;
              return (
              <div key={item.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {productImageUrl ? (
                      <img
                        src={productImageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span className={`text-5xl ${productImageUrl ? 'hidden' : ''}`}>📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-900 mb-1">{item.product.name}</h3>
                    {item.variant && (
                      <p className="text-sm text-gray-600 mb-2">{item.variant.name}</p>
                    )}
                    <p className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {item.price.toLocaleString('cs-CZ')} Kč
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-10 h-10 border-2 border-gray-300 rounded-xl font-bold hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
                    >
                      −
                    </button>
                    <span className="w-16 text-center font-bold text-lg">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-10 h-10 border-2 border-gray-300 rounded-xl font-bold hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:text-red-700 font-semibold px-4 py-2 rounded-xl hover:bg-red-50 transition-all"
                  >
                    🗑️ Odstranit
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-gray-600">Celkem za položku:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {(item.price * item.quantity).toLocaleString('cs-CZ')} Kč
                  </span>
                </div>
              </div>
            );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 sticky top-4">
              <h2 className="text-2xl font-extrabold mb-6 text-slate-900">Souhrn objednávky</h2>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Položek:</span>
                  <span className="font-bold">{cart.itemCount}</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-2xl font-extrabold">
                    <span className="text-slate-900">Celkem:</span>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {cart.total.toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href="/checkout"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-center block"
              >
                Pokračovat k pokladně →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

