'use client';

/**
 * Admin Dashboard Home Page
 * Overview with statistics and quick actions
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, SalesData, RevenueData } from '@/lib/api/admin';
import type { RevenueMoM, ConversionRate, SlaStats, LowStockItem } from '@/lib/admin';
import { ordersApi, Order } from '@/lib/api/orders';
import LoadingSpinner from '@/components/LoadingSpinner';
import { RevenueMomBarChart } from '@/components/admin/RevenueMomBarChart';

export default function AdminDashboardPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [revenueMom, setRevenueMom] = useState<RevenueMoM[]>([]);
  const [conversionRate, setConversionRate] = useState<ConversionRate | null>(null);
  const [slaStats, setSlaStats] = useState<SlaStats | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [
        salesResponse,
        revenueResponse,
        ordersResponse,
        revenueMomResponse,
        conversionResponse,
        slaResponse,
        lowStockResponse,
      ] = await Promise.all([
        adminApi.getSales(),
        adminApi.getRevenue(),
        ordersApi.getOrders(),
        adminApi.getRevenueMoM(6),
        adminApi.getConversionRate(30),
        adminApi.getSlaStats(30),
        adminApi.getLowStock(10),
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
      if (revenueMomResponse.success && revenueMomResponse.data) {
        setRevenueMom(revenueMomResponse.data);
      }
      if (conversionResponse.success && conversionResponse.data) {
        setConversionRate(conversionResponse.data);
      }
      if (slaResponse.success && slaResponse.data) {
        setSlaStats(slaResponse.data);
      }
      if (lowStockResponse.success && lowStockResponse.data) {
        setLowStockItems(lowStockResponse.data.items);
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

      {lowStockItems.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-amber-200 overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
            <h2 className="text-lg font-bold text-amber-900">Nízký sklad — produkty</h2>
            <p className="text-sm text-amber-800 mt-1">
              {lowStockItems.length} položek pod prahem (skladem &lt; 10)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600 border-b border-gray-200">
                  <th className="px-4 py-3 font-semibold">Produkt</th>
                  <th className="px-4 py-3 font-semibold">Sklad</th>
                  <th className="px-4 py-3 font-semibold">Práh</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((row) => (
                  <tr
                    key={row.productId}
                    className={
                      row.stock === 0
                        ? 'bg-red-50 border-b border-red-100'
                        : row.stock < row.threshold
                          ? 'bg-orange-50 border-b border-orange-100'
                          : 'border-b border-gray-100'
                    }
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{row.productName}</td>
                    <td className="px-4 py-3 tabular-nums">{row.stock}</td>
                    <td className="px-4 py-3 tabular-nums">{row.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

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

      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <p className="text-sm font-semibold text-gray-600 mb-1">Konverzní poměr</p>
        <p className="text-xs text-gray-500 mb-4">
          Cíl: {'>'} 2 % · posledních 30 dní (potvrzené / všechny)
        </p>
        {conversionRate ? (
          <div className="flex flex-wrap items-end gap-6">
            <p
              className={`text-5xl md:text-6xl font-extrabold tabular-nums ${
                conversionRate.conversionRate >= conversionRate.targetPct
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {new Intl.NumberFormat('cs-CZ', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(conversionRate.conversionRate)}
              %
            </p>
            <p className="text-sm text-gray-600 pb-2">
              {conversionRate.confirmedOrders} potvrzených / {conversionRate.totalOrders} celkem
            </p>
          </div>
        ) : (
          <p className="text-gray-500">Nepodařilo se načíst konverzi.</p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <p className="text-sm font-semibold text-gray-600 mb-1">SLA plnění objednávek</p>
        <p className="text-xs text-gray-500 mb-4">
          Cíl: &lt;48 h · posledních 30 dní (odesláno/doručeno → čas od potvrzení nebo vytvoření)
        </p>
        {slaStats ? (
          <div className="flex flex-wrap items-end gap-8">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Průměr (h)
              </p>
              <p
                className={`text-5xl md:text-6xl font-extrabold tabular-nums ${
                  slaStats.avgFulfilmentHours < slaStats.slaTargetHours
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {new Intl.NumberFormat('cs-CZ', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }).format(slaStats.avgFulfilmentHours)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                V cíli SLA
              </p>
              <p
                className={`text-4xl md:text-5xl font-extrabold tabular-nums ${
                  slaStats.avgFulfilmentHours < slaStats.slaTargetHours
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {new Intl.NumberFormat('cs-CZ', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }).format(slaStats.pctMeetingSla)}
                %
              </p>
            </div>
            <p className="text-sm text-gray-600 pb-2">
              {slaStats.totalFulfilled} dokončených zásilek v období
            </p>
          </div>
        ) : (
          <p className="text-gray-500">Nepodařilo se načíst SLA.</p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Tržby MoM (CZK)</h2>
        <p className="text-sm text-gray-500 mb-6">
          Potvrzené objednávky — součet <code className="text-xs">total</code> za kalendářní měsíc
          (posledních 6 měsíců).{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">GET /api/admin/analytics/revenue-mom?months=6</code>
        </p>
        <RevenueMomBarChart rows={revenueMom} />
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

