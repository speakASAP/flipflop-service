'use client';

/**
 * Admin Order Detail Page
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { adminApi, Order } from '@/lib/api/admin';
import { OrderStatus, PaymentStatus } from '@/lib/api/orders';
import { PaginatedResponse } from '@/lib/api/products';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: '' as OrderStatus | '',
    paymentStatus: '' as PaymentStatus | '',
    notes: '',
  });

  const loadOrder = useCallback(async () => {
    try {
      // Use ordersApi to get order detail
      const response = await adminApi.getAllOrders({ page: 1, limit: 1000 });
      if (response.success && response.data) {
        const data = response.data as PaginatedResponse<Order>;
        const orders = data.items || [];
        const foundOrder = orders.find((o: Order) => o.id === orderId);
        if (foundOrder) {
          setOrder(foundOrder);
          setStatusForm({
            status: foundOrder.status,
            paymentStatus: foundOrder.paymentStatus,
            notes: '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId, loadOrder]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const response = await adminApi.updateOrderStatus(orderId, {
        status: statusForm.status || undefined,
        paymentStatus: statusForm.paymentStatus || undefined,
        notes: statusForm.notes || undefined,
      });
      if (response.success) {
        loadOrder();
        alert('Status objednávky byl aktualizován');
      } else {
        alert('Nepodařilo se aktualizovat status');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Nepodařilo se aktualizovat status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Objednávka nenalezena</p>
        <Link
          href="/admin/orders"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Zpět na seznam
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Objednávka {order.orderNumber}
          </h1>
          <p className="text-gray-600 mt-1">
            Vytvořeno: {new Date(order.createdAt).toLocaleString('cs-CZ')}
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="text-gray-600 hover:text-gray-700 font-medium"
        >
          ← Zpět na seznam
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Položky objednávky
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-sm text-gray-500">SKU: {item.productSku}</p>
                    <p className="text-sm text-gray-500">
                      Množství: {item.quantity} × {new Intl.NumberFormat('cs-CZ', {
                        style: 'currency',
                        currency: 'CZK',
                      }).format(item.unitPrice)}
                    </p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {new Intl.NumberFormat('cs-CZ', {
                      style: 'currency',
                      currency: 'CZK',
                    }).format(item.totalPrice)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mezisoučet</span>
                <span className="text-gray-900">
                  {new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency: 'CZK',
                  }).format(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">DPH</span>
                <span className="text-gray-900">
                  {new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency: 'CZK',
                  }).format(order.tax)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Doprava</span>
                <span className="text-gray-900">
                  {new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency: 'CZK',
                  }).format(order.shippingCost)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sleva</span>
                  <span className="text-red-600">
                    -{new Intl.NumberFormat('cs-CZ', {
                      style: 'currency',
                      currency: 'CZK',
                    }).format(order.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span className="text-gray-900">Celkem</span>
                <span className="text-gray-900">
                  {new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency: 'CZK',
                  }).format(order.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Dodací adresa
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>{order.deliveryAddress.firstName} {order.deliveryAddress.lastName}</strong>
              </p>
              <p>{order.deliveryAddress.street}</p>
              <p>
                {order.deliveryAddress.city}, {order.deliveryAddress.postalCode}
              </p>
              <p>{order.deliveryAddress.country}</p>
              {order.deliveryAddress.phone && (
                <p>Tel: {order.deliveryAddress.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Status Update */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Aktualizovat status
            </h2>
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status objednávky
                </label>
                <select
                  value={statusForm.status}
                  onChange={(e) =>
                    setStatusForm({
                      ...statusForm,
                      status: e.target.value as OrderStatus,
                    })
                  }
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value={OrderStatus.PENDING}>Čeká na potvrzení</option>
                  <option value={OrderStatus.CONFIRMED}>Potvrzeno</option>
                  <option value={OrderStatus.PROCESSING}>Zpracovává se</option>
                  <option value={OrderStatus.SHIPPED}>Odesláno</option>
                  <option value={OrderStatus.DELIVERED}>Doručeno</option>
                  <option value={OrderStatus.CANCELLED}>Zrušeno</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status platby
                </label>
                <select
                  value={statusForm.paymentStatus}
                  onChange={(e) =>
                    setStatusForm({
                      ...statusForm,
                      paymentStatus: e.target.value as PaymentStatus,
                    })
                  }
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value={PaymentStatus.PENDING}>Čeká na platbu</option>
                  <option value={PaymentStatus.PAID}>Zaplaceno</option>
                  <option value={PaymentStatus.FAILED}>Selhalo</option>
                  <option value={PaymentStatus.REFUNDED}>Vráceno</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poznámky
                </label>
                <textarea
                  value={statusForm.notes}
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={updating}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {updating ? 'Ukládání...' : 'Uložit změny'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

