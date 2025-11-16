'use client';

/**
 * Edit Product Page
 * Form to edit an existing product
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { productsApi, Product } from '@/lib/api/products';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

// Extended Product type with additional optional fields for admin editing
type ExtendedProduct = Product & {
  shortDescription?: string;
  compareAtPrice?: number;
  manufacturer?: string;
  mainImageUrl?: string;
  trackInventory?: boolean;
  isActive?: boolean;
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    shortDescription: '',
    price: '',
    compareAtPrice: '',
    stockQuantity: '',
    brand: '',
    manufacturer: '',
    mainImageUrl: '',
    imageUrls: '',
    trackInventory: true,
    isActive: true,
  });

  const loadProduct = useCallback(async () => {
    try {
      const response = await productsApi.getProduct(productId);
      if (response.success && response.data) {
        const p = response.data as ExtendedProduct;
        setProduct(p);
        setFormData({
          name: p.name || '',
          sku: p.sku || '',
          description: p.description || '',
          shortDescription: p.shortDescription || '',
          price: String(p.price || 0),
          compareAtPrice: String(p.compareAtPrice || ''),
          stockQuantity: String(p.stockQuantity || 0),
          brand: p.brand || '',
          manufacturer: p.manufacturer || '',
          mainImageUrl: p.mainImageUrl || (p.images?.[0] || ''),
          imageUrls: p.images?.join(', ') || '',
          trackInventory: p.trackInventory !== false,
          isActive: p.isActive !== false,
        });
      }
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId, loadProduct]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const productData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || undefined,
        shortDescription: formData.shortDescription || undefined,
        price: parseFloat(formData.price),
        compareAtPrice: formData.compareAtPrice
          ? parseFloat(formData.compareAtPrice)
          : undefined,
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        brand: formData.brand || undefined,
        manufacturer: formData.manufacturer || undefined,
        mainImageUrl: formData.mainImageUrl || undefined,
        imageUrls: formData.imageUrls
          ? formData.imageUrls.split(',').map((url) => url.trim())
          : undefined,
        trackInventory: formData.trackInventory,
        isActive: formData.isActive,
      };

      const response = await productsApi.updateProduct(productId, productData);
      if (response.success) {
        router.push('/admin/products');
      } else {
        alert('Nepodařilo se aktualizovat produkt');
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Nepodařilo se aktualizovat produkt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Produkt nenalezen</p>
        <Link
          href="/admin/products"
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
          <h1 className="text-3xl font-bold text-gray-900">Upravit produkt</h1>
          <p className="text-gray-600 mt-1">{product.name}</p>
        </div>
        <Link
          href="/admin/products"
          className="text-gray-600 hover:text-gray-700 font-medium"
        >
          ← Zpět na seznam
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Same form structure as create page */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Základní informace
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Název produktu *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU *
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Krátký popis
              </label>
              <input
                type="text"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Popis
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cena</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cena (Kč) *
              </label>
              <input
                type="number"
                step="0.01"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Původní cena (pro slevu)
              </label>
              <input
                type="number"
                step="0.01"
                name="compareAtPrice"
                value={formData.compareAtPrice}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sklad</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Množství na skladě
              </label>
              <input
                type="number"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center pt-8">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="trackInventory"
                  checked={formData.trackInventory}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Sledovat sklad</span>
              </label>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Značka a výrobce
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Značka
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Výrobce
              </label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Obrázky</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hlavní obrázek (URL)
              </label>
              <input
                type="url"
                name="mainImageUrl"
                value={formData.mainImageUrl}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Další obrázky (URL, oddělené čárkami)
              </label>
              <input
                type="text"
                name="imageUrls"
                value={formData.imageUrls}
                onChange={handleChange}
                placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Produkt je aktivní</span>
          </label>
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? 'Ukládání...' : 'Uložit změny'}
          </button>
          <Link
            href="/admin/products"
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Zrušit
          </Link>
        </div>
      </form>
    </div>
  );
}

