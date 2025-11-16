'use client';

/**
 * Admin Dashboard Home Page
 * Overview with statistics and quick actions
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, SalesData, RevenueData } from '@/lib/api/admin';
import { ordersApi, Order } from '@/lib/api/orders';
import LoadingSpinner from '@/components/LoadingSpinner';
export default function AdminDashboardPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [salesResponse, revenueResponse, ordersResponse] = await Promise.all([
        adminApi.getSales(),
        adminApi.getRevenue(),
        ordersApi.getOrders(),
      ]);

      if (salesResponse.success && salesResponse.data) {
        setSalesData(salesResponse.data);
      }
      if (revenueResponse.success && revenueResponse.data) {
        setRevenueData(revenueResponse.data);
      }
      if (ordersResponse.success && ordersResponse.data) {
        // Get last 5 orders
        setRecentOrders(ordersResponse.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-xl font-semibold text-gray-600 mt-4">Načítání dashboardu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Admin Dashboard</h1>
        <p className="text-xl text-blue-50">
          Přehled prodeje a aktivit na platformě
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Celkový prodej</p>
              <p className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {salesData?.totalSales
                  ? new Intl.NumberFormat('cs-CZ', {
                      style: 'currency',
                      currency: 'CZK',
                    }).format(salesData.totalSales)
                  : '0 Kč'}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl shadow-md">
              <span className="text-3xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Celkový příjem</p>
              <p className="text-3xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {revenueData?.totalRevenue
                  ? new Intl.NumberFormat('cs-CZ', {
                      style: 'currency',
                      currency: 'CZK',
                    }).format(revenueData.totalRevenue)
                  : '0 Kč'}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl shadow-md">
              <span className="text-3xl">📈</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Počet objednávek</p>
              <p className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {salesData?.orderCount || 0}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl shadow-md">
              <span className="text-3xl">🛒</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Průměrná objednávka</p>
              <p className="text-3xl font-extrabold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                {salesData?.averageOrderValue
                  ? new Intl.NumberFormat('cs-CZ', {
                      style: 'currency',
                      currency: 'CZK',
                    }).format(salesData.averageOrderValue)
                  : '0 Kč'}
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl shadow-md">
              <span className="text-3xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-6">⚡ Rychlé akce</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/products/new"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all shadow-sm hover:shadow-md transform hover:scale-105"
          >
            <span className="text-4xl mb-3">➕</span>
            <span className="text-sm font-bold text-gray-700">Nový produkt</span>
          </Link>
          <Link
            href="/admin/orders"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all shadow-sm hover:shadow-md transform hover:scale-105"
          >
            <span className="text-4xl mb-3">🛒</span>
            <span className="text-sm font-bold text-gray-700">Objednávky</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all shadow-sm hover:shadow-md transform hover:scale-105"
          >
            <span className="text-4xl mb-3">👥</span>
            <span className="text-sm font-bold text-gray-700">Uživatelé</span>
          </Link>
          <Link
            href="/admin/analytics"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all shadow-sm hover:shadow-md transform hover:scale-105"
          >
            <span className="text-4xl mb-3">📈</span>
            <span className="text-sm font-bold text-gray-700">Analytika</span>
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-slate-900">📦 Nedávné objednávky</h2>
          <Link
            href="/admin/orders"
            className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-2 group"
          >
            Zobrazit všechny
            <span className="transform group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Číslo objednávky
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Zákazník
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Celkem
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Datum
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {order.deliveryAddress.firstName} {order.deliveryAddress.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                      {new Intl.NumberFormat('cs-CZ', {
                        style: 'currency',
                        currency: 'CZK',
                      }).format(order.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('cs-CZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500 text-lg">Zatím nebyly vytvořeny žádné objednávky</p>
          </div>
        )}
      </div>
    </div>
  );
}

