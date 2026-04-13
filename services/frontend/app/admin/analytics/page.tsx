'use client';

/**
 * Admin Analytics Dashboard
 */

import { useEffect, useState, useCallback } from 'react';
import {
  adminApi,
  SalesData,
  RevenueData,
  MarginAnalysis,
  CheckoutFunnel,
  CompetitorAnalysis,
} from '@/lib/api/admin';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminAnalyticsPage() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [marginData, setMarginData] = useState<MarginAnalysis | null>(null);
  const [funnelData, setFunnelData] = useState<CheckoutFunnel | null>(null);
  const [competitorData, setCompetitorData] = useState<CompetitorAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [salesResponse, revenueResponse, marginResponse, funnelResponse, competitorResponse] =
        await Promise.all([
          adminApi.getSales(
            dateRange.startDate || undefined,
            dateRange.endDate || undefined
          ),
          adminApi.getRevenue(
            dateRange.startDate || undefined,
            dateRange.endDate || undefined
          ),
          adminApi.getMarginAnalysis(
            dateRange.startDate || undefined,
            dateRange.endDate || undefined
          ),
          adminApi.getCheckoutFunnel(30),
          adminApi.getCompetitorAnalysis(),
        ]);

      if (salesResponse.success && salesResponse.data) {
        setSalesData(salesResponse.data);
      }
      if (revenueResponse.success && revenueResponse.data) {
        setRevenueData(revenueResponse.data);
      }
      if (marginResponse.success && marginResponse.data) {
        setMarginData(marginResponse.data);
      }
      if (funnelResponse.success && funnelResponse.data) {
        setFunnelData(funnelResponse.data);
      }
      if (competitorResponse.success && competitorResponse.data) {
        setCompetitorData(competitorResponse.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleDateFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadAnalytics();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-xl font-semibold text-gray-600 mt-4">Načítání analytiky...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2">📈 Analytika</h1>
        <p className="text-xl text-blue-50">Přehled prodeje a výkonnosti</p>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-extrabold text-slate-900 mb-4">📅 Filtrovat podle data</h2>
        <form onSubmit={handleDateFilter} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Od data
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Do data
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
          <button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
          >
            🔍 Filtrovat
          </button>
        </form>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-600">Celkový prodej</p>
            <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl shadow-md">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {salesData?.totalSales
              ? new Intl.NumberFormat('cs-CZ', {
                  style: 'currency',
                  currency: 'CZK',
                }).format(salesData.totalSales)
              : '0 Kč'}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-600">Celkový příjem</p>
            <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl shadow-md">
              <span className="text-2xl">📈</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {revenueData?.totalRevenue
              ? new Intl.NumberFormat('cs-CZ', {
                  style: 'currency',
                  currency: 'CZK',
                }).format(revenueData.totalRevenue)
              : '0 Kč'}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-600">Počet objednávek</p>
            <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl shadow-md">
              <span className="text-2xl">🛒</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {salesData?.orderCount || 0}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-600">Průměrná marže</p>
            <div className="p-3 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl shadow-md">
              <span className="text-2xl">📊</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            {marginData?.averageMargin
              ? new Intl.NumberFormat('cs-CZ', {
                  style: 'currency',
                  currency: 'CZK',
                }).format(marginData.averageMargin)
              : '0 Kč'}
          </p>
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-6">📊 Detailní analýza</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <p className="text-sm font-semibold text-gray-600 mb-2">Průměrná hodnota objednávky</p>
            <p className="text-2xl font-extrabold text-blue-600">
              {salesData?.averageOrderValue
                ? new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency: 'CZK',
                  }).format(salesData.averageOrderValue)
                : '0 Kč'}
            </p>
          </div>
          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <p className="text-sm font-semibold text-gray-600 mb-2">Celková marže</p>
            <p className="text-2xl font-extrabold text-green-600">
              {marginData?.totalMargin
                ? new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency: 'CZK',
                  }).format(marginData.totalMargin)
                : '0 Kč'}
            </p>
          </div>
        </div>
      </div>

      {funnelData && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mt-6">
          <h2 className="text-xl font-extrabold mb-4 text-slate-900">
            Konverzní trychtýř — posledních 30 dní
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {(
              [
                { label: 'Objednávky', value: funnelData.orders_created },
                { label: 'Platba zahájena', value: funnelData.payments_initiated },
                { label: 'Platba úspěšná', value: funnelData.payments_completed },
                { label: 'Platba selhala', value: funnelData.payments_failed },
              ] as const
            ).map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4 text-center bg-gray-50 border border-gray-200"
              >
                <p className="text-3xl font-extrabold text-slate-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-green-600">
                {funnelData.completion_rate_pct}%
              </p>
              <p className="text-sm text-gray-500">Konverzní poměr</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-extrabold text-red-500">
                {funnelData.abandonment_rate_pct}%
              </p>
              <p className="text-sm text-gray-500">Míra opuštění</p>
            </div>
          </div>
        </div>
      )}

      {competitorData && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-bold mb-3 text-slate-900">Cenová konkurenceschopnost (AI)</h3>
          <p className="text-xs text-gray-400 mb-3">
            Generováno: {new Date(competitorData.generatedAt).toLocaleString('cs-CZ')}
          </p>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {competitorData.commentary}
          </p>
          {competitorData.products.length > 0 && (
            <ul className="mt-4 space-y-1">
              {competitorData.products.map((product, index) => (
                <li
                  key={`${product.name}-${index}`}
                  className="text-sm text-gray-600 flex justify-between"
                >
                  <span>{product.name}</span>
                  <span className="font-semibold">
                    {product.price.toLocaleString('cs-CZ')} Kč
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

