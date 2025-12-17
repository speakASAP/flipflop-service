'use client';

/**
 * Admin Sync Page
 * Manage product synchronization with Allegro
 */

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api/admin';
import LoadingSpinner from '@/components/LoadingSpinner';

interface SyncResult {
  total: number;
  products: Array<{
    name: string;
    sku: string;
    price: number;
    stockQuantity: number;
    [key: string]: unknown;
  }>;
  message: string;
}

export default function AdminSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncAll, setSyncAll] = useState(true);
  const [productCodes, setProductCodes] = useState('');
  const [allegroProducts, setAllegroProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    loadAllegroProducts();
  }, []);

  const loadAllegroProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await adminApi.getAllegroProducts({ limit: 20 });
      if (response.success && response.data) {
        setAllegroProducts(response.data.items || []);
      }
    } catch (err: any) {
      console.error('Failed to load Allegro products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const codes = productCodes
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const response = await adminApi.syncProductsFromAllegro({
        productCodes: codes.length > 0 ? codes : undefined,
        syncAll: syncAll && codes.length === 0,
      });

      if (response.success && response.data) {
        setSyncResult(response.data);
      } else {
        setError(response.error?.message || 'Sync failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync products');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
          🔄 Synchronizace produktů
        </h1>
        <p className="text-gray-600">
          Synchronizujte produkty a skladové zásoby z Allegro aplikace
        </p>
      </div>

      {/* Sync Options */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Možnosti synchronizace</h2>

        <div className="space-y-6">
          {/* Sync All Toggle */}
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              id="syncAll"
              checked={syncAll}
              onChange={(e) => {
                setSyncAll(e.target.checked);
                if (e.target.checked) {
                  setProductCodes('');
                }
              }}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="syncAll" className="text-lg font-medium text-gray-700">
              Synchronizovat všechny aktivní produkty z Allegro
            </label>
          </div>

          {/* Product Codes Input */}
          <div>
            <label
              htmlFor="productCodes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nebo zadejte kódy produktů (oddělené čárkou):
            </label>
            <input
              type="text"
              id="productCodes"
              value={productCodes}
              onChange={(e) => {
                setProductCodes(e.target.value);
                if (e.target.value.trim()) {
                  setSyncAll(false);
                }
              }}
              disabled={syncAll}
              placeholder="např: PROD-001, PROD-002, PROD-003"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="mt-2 text-sm text-gray-500">
              Ponechte prázdné pro synchronizaci všech produktů
            </p>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing || (!syncAll && !productCodes.trim())}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {syncing ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Synchronizuji...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Spustit synchronizaci</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
          <div className="flex items-center">
            <span className="text-red-500 text-2xl mr-3">❌</span>
            <div>
              <h3 className="text-red-800 font-bold">Chyba synchronizace</h3>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-xl">
          <div className="flex items-center mb-4">
            <span className="text-green-500 text-2xl mr-3">✅</span>
            <h3 className="text-green-800 font-bold">Synchronizace dokončena</h3>
          </div>
          <div className="space-y-2 text-green-700">
            <p>
              <strong>Celkem produktů:</strong> {syncResult.total}
            </p>
            <p className="text-sm">{syncResult.message}</p>
          </div>

          {/* Products List */}
          {syncResult.products && syncResult.products.length > 0 && (
            <div className="mt-6">
              <h4 className="font-bold text-green-800 mb-3">
                Synchronizované produkty ({syncResult.products.length}):
              </h4>
              <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Název
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cena
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Skladem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {syncResult.products.slice(0, 20).map((product, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.sku}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{product.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {product.price?.toLocaleString('cs-CZ', {
                            style: 'currency',
                            currency: 'CZK',
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {product.stockQuantity || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {syncResult.products.length > 20 && (
                  <p className="mt-3 text-sm text-gray-500 text-center">
                    Zobrazeno 20 z {syncResult.products.length} produktů
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Allegro Products Preview */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Náhled produktů z Allegro
          </h2>
          <button
            onClick={loadAllegroProducts}
            disabled={loadingProducts}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loadingProducts ? 'Načítám...' : '🔄 Obnovit'}
          </button>
        </div>

        {loadingProducts ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : allegroProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kód
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Název
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Skladem
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Aktivní
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allegroProducts.map((product: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{product.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {product.stockQuantity || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.active ? 'Ano' : 'Ne'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            Žádné produkty k zobrazení
          </p>
        )}
      </div>
    </div>
  );
}

