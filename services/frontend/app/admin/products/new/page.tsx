'use client';

/**
 * Create Product Page
 * Form to create a new product
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { productsApi } from '@/lib/api/products';
import Link from 'next/link';

export default function CreateProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    setLoading(true);

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

      const response = await productsApi.createProduct(productData);
      if (response.success) {
        router.push('/admin/products');
      } else {
        alert('Nepodařilo se vytvořit produkt');
      }
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('Nepodařilo se vytvořit produkt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nový produkt</h1>
          <p className="text-gray-600 mt-1">Vytvořte nový produkt</p>
        </div>
        <Link
          href="/admin/products"
          className="text-gray-600 hover:text-gray-700 font-medium"
        >
          ← Zpět na seznam
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Basic Information */}
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

        {/* Pricing */}
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

        {/* Inventory */}
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

        {/* Brand & Manufacturer */}
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

        {/* Images */}
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

        {/* Status */}
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

        {/* Actions */}
        <div className="flex gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Ukládání...' : 'Vytvořit produkt'}
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

