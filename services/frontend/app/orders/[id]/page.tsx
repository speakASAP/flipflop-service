'use client';

import { useEffect, useState } from 'react';
import { ordersApi, Order } from '@/lib/api/orders';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function OrderDetailPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (params.id) {
      loadOrder(params.id as string);
    }
  }, [isAuthenticated, params.id, router]);

  const loadOrder = async (id: string) => {
    try {
      const response = await ordersApi.getOrder(id);
      if (response.success && response.data) {
        setOrder(response.data);
      }
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800';
      case 'SHIPPED':
        return 'bg-indigo-100 text-indigo-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'Čeká na potvrzení',
      CONFIRMED: 'Potvrzeno',
      PROCESSING: 'Zpracovává se',
      SHIPPED: 'Odesláno',
      DELIVERED: 'Doručeno',
      CANCELLED: 'Zrušeno',
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p className="text-xl font-semibold text-gray-600">Načítání objednávky...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl shadow-xl p-12">
            <div className="text-8xl mb-6">❌</div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Objednávka nenalezena</h1>
            <Link href="/orders" className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
              ← Zpět na objednávky
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link href="/orders" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6 transition-colors">
          ← Zpět na objednávky
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-slate-900">
                Objednávka #{order.orderNumber}
              </h1>
              <p className="text-gray-600 text-lg">
                📅 Datum: {new Date(order.createdAt).toLocaleDateString('cs-CZ', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <span className={`px-6 py-3 rounded-xl text-lg font-bold shadow-lg ${getStatusColor(order.status)}`}>
              {getStatusText(order.status)}
            </span>
          </div>

          {/* Order Items */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold mb-6 text-slate-900">Položky objednávky</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-4 border-b border-gray-200 last:border-0">
                  <div>
                    <p className="font-bold text-lg text-slate-900">{item.productName}</p>
                    <p className="text-sm text-gray-600 mt-1">SKU: {item.productSku}</p>
                    <p className="text-sm text-gray-600">Množství: {item.quantity} ks</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-xl text-blue-600">{item.totalPrice.toLocaleString('cs-CZ')} Kč</p>
                    <p className="text-sm text-gray-600">
                      {item.unitPrice.toLocaleString('cs-CZ')} Kč / ks
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <h2 className="text-2xl font-extrabold mb-4 text-slate-900">📍 Dodací adresa</h2>
            <div>
              <p className="font-bold text-lg text-slate-900 mb-2">
                {order.deliveryAddress.firstName} {order.deliveryAddress.lastName}
              </p>
              <p className="text-gray-700">{order.deliveryAddress.street}</p>
              <p className="text-gray-700">
                {order.deliveryAddress.city}, {order.deliveryAddress.postalCode}
              </p>
              <p className="text-gray-700">{order.deliveryAddress.country}</p>
              {order.deliveryAddress.phone && (
                <p className="text-gray-700 mt-2">📞 {order.deliveryAddress.phone}</p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-2xl font-extrabold mb-6 text-slate-900">Souhrn</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">Mezisoučet:</span>
                <span className="font-bold">{order.subtotal.toLocaleString('cs-CZ')} Kč</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">DPH (21%):</span>
                <span className="font-bold">{order.tax.toLocaleString('cs-CZ')} Kč</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-600">Doprava:</span>
                <span className="font-bold">{order.shippingCost.toLocaleString('cs-CZ')} Kč</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-lg text-green-600">
                  <span>Sleva:</span>
                  <span className="font-bold">-{order.discount.toLocaleString('cs-CZ')} Kč</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between text-3xl font-extrabold">
                  <span className="text-slate-900">Celkem:</span>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {order.total.toLocaleString('cs-CZ')} Kč
                  </span>
                </div>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="font-bold text-lg mb-2 text-slate-900">📝 Poznámka:</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-xl">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
