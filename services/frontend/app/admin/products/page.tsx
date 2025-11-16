'use client';

/**
 * Admin Products List Page
 * List all products with search, filter, and management actions
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { productsApi, Product, PaginatedResponse } from '@/lib/api/products';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productsApi.getProducts({
        page,
        limit: 20,
        search: search || undefined,
      });
      if (response.success && response.data) {
        const data = response.data as PaginatedResponse<Product>;
        if (data.items) {
          setProducts(data.items);
          setTotalPages(data.pagination?.totalPages || 1);
          setTotal(data.pagination?.total || 0);
        } else {
          // Fallback for non-paginated response
          setProducts(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Opravdu chcete smazat produkt "${name}"?`)) {
      return;
    }

    try {
      const response = await productsApi.deleteProduct(id);
      if (response.success) {
        loadProducts();
      } else {
        alert('Nepodařilo se smazat produkt');
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Nepodařilo se smazat produkt');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-xl font-semibold text-gray-600 mt-4">Načítání produktů...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2">📦 Produkty</h1>
            <p className="text-xl text-blue-50">
              Správa produktů ({total} celkem)
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/admin/products/new"
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-center"
            >
              ➕ Nový produkt
            </Link>
            <Link
              href="/admin/products/import"
              className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-center"
            >
              📥 Import CSV
            </Link>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat produkty..."
            className="flex-1 border-2 border-gray-300 rounded-xl px-5 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
          >
            🔍 Hledat
          </button>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        {products.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Produkt
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Cena
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Skladem
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Akce
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {product.images && product.images.length > 0 ? (
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              width={56}
                              height={56}
                              className="w-14 h-14 object-cover rounded-xl shadow-md"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center shadow-md">
                              <span className="text-2xl">📦</span>
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              {product.name}
                            </Link>
                            {product.brand && (
                              <p className="text-xs text-gray-500 mt-1">{product.brand}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                        {new Intl.NumberFormat('cs-CZ', {
                          style: 'currency',
                          currency: 'CZK',
                        }).format(product.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {product.stockQuantity || 0} ks
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${
                            product.stockQuantity && product.stockQuantity > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.stockQuantity && product.stockQuantity > 0
                            ? '✓ Na skladě'
                            : '✗ Vyprodáno'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all"
                          >
                            ✏️ Upravit
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all"
                          >
                            🗑️ Smazat
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm font-semibold text-gray-700">
                  Zobrazeno {products.length} z {total} produktů
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-6 py-2 bg-white border-2 border-gray-300 rounded-xl font-semibold hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Předchozí
                  </button>
                  <span className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg">
                    Stránka {page} z {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-6 py-2 bg-white border-2 border-gray-300 rounded-xl font-semibold hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Další →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📦</div>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Žádné produkty nenalezeny</h2>
            <p className="text-gray-600 mb-6">Začněte přidáváním prvního produktu</p>
            <Link
              href="/admin/products/new"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              ➕ Vytvořit první produkt
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

