'use client';

import { useEffect, useState } from 'react';
import { cartApi, Cart } from '@/lib/api/cart';
import { addressesApi, DeliveryAddress } from '@/lib/api/addresses';
import { ordersApi } from '@/lib/api/orders';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadData();
  }, [isAuthenticated, router]);

  const loadData = async () => {
    try {
      const [cartResponse, addressesResponse] = await Promise.all([
        cartApi.getCart(),
        addressesApi.getAddresses(),
      ]);

      if (cartResponse.success && cartResponse.data) {
        setCart(cartResponse.data);
      }

      if (addressesResponse.success && addressesResponse.data) {
        setAddresses(addressesResponse.data);
        const defaultAddress = addressesResponse.data.find((a) => a.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        } else if (addressesResponse.data.length > 0) {
          setSelectedAddressId(addressesResponse.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load checkout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      alert('Vyberte prosím dodací adresu');
      return;
    }

    setProcessing(true);

    try {
      const response = await ordersApi.createOrder({
        deliveryAddressId: selectedAddressId,
        paymentMethod: 'payu',
      });

      if (response.success && response.data) {
        // Redirect to payment
        const paymentResponse = await ordersApi.createPayment(response.data.id);
        if (paymentResponse.success && paymentResponse.data) {
          window.location.href = paymentResponse.data.redirectUri;
        } else {
          router.push(`/orders/${response.data.id}`);
        }
      } else {
        alert('Nepodařilo se vytvořit objednávku');
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Došlo k chybě při vytváření objednávky');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p className="text-xl font-semibold text-gray-600">Načítání...</p>
        </div>
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
            <p className="text-xl text-gray-600 mb-8">Přidejte produkty do košíku před pokračováním</p>
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
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-slate-900">Pokladna</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-extrabold mb-6 text-slate-900 flex items-center gap-2">
                📍 Dodací adresa
              </h2>
              {addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block border-2 rounded-xl p-5 cursor-pointer transition-all ${
                        selectedAddressId === address.id
                          ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md'
                          : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="address"
                          value={address.id}
                          checked={selectedAddressId === address.id}
                          onChange={(e) => setSelectedAddressId(e.target.value)}
                          className="mt-1 w-5 h-5 text-blue-600"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-lg text-slate-900 mb-1">
                            {address.firstName} {address.lastName}
                          </p>
                          <p className="text-gray-600 mb-1">
                            {address.street}
                          </p>
                          <p className="text-gray-600 mb-1">
                            {address.city}, {address.postalCode}
                          </p>
                          <p className="text-gray-600">{address.country}</p>
                          {address.phone && (
                            <p className="text-gray-600 mt-2">📞 {address.phone}</p>
                          )}
                          {address.isDefault && (
                            <span className="inline-block mt-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                              Výchozí adresa
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                  <button
                    onClick={() => router.push('/profile/addresses')}
                    className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-2 transition-colors"
                  >
                    + Přidat novou adresu
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📍</div>
                  <p className="text-gray-600 mb-6">Nemáte žádnou dodací adresu</p>
                  <button
                    onClick={() => router.push('/profile/addresses')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Přidat adresu
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-extrabold mb-6 text-slate-900">Přehled objednávky</h2>
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-0">
                    <div>
                      <span className="font-semibold text-slate-900">{item.product.name}</span>
                      {item.variant && (
                        <span className="text-sm text-gray-600 ml-2">({item.variant.name})</span>
                      )}
                      <span className="text-gray-600 ml-2">x {item.quantity}</span>
                    </div>
                    <span className="font-bold text-blue-600 text-lg">
                      {(item.price * item.quantity).toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Total */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 sticky top-4">
              <h2 className="text-2xl font-extrabold mb-6 text-slate-900">Celkem</h2>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Mezisoučet:</span>
                  <span className="font-bold">{cart.total.toLocaleString('cs-CZ')} Kč</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Doprava:</span>
                  <span className="font-bold">99 Kč</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-2xl font-extrabold">
                    <span className="text-slate-900">Celkem:</span>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {(cart.total + 99).toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handlePlaceOrder}
                disabled={processing || !selectedAddressId || addresses.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {processing ? '⏳ Zpracování...' : '✅ Dokončit objednávku'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
