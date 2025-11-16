'use client';

/**
 * Company Settings Page
 */

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api/admin';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    country: '',
    ico: '',
    dic: '',
    phone: '',
    email: '',
    website: '',
  });

  const loadSettings = useCallback(async () => {
    try {
      const response = await adminApi.getCompanySettings();
      if (response.success && response.data) {
        const data = response.data;
        setFormData({
          name: data.name || '',
          address: data.address || '',
          country: data.country || '',
          ico: data.ico || '',
          dic: data.dic || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await adminApi.updateCompanySettings(formData);
      if (response.success) {
        alert('Nastavení byla uložena');
        loadSettings();
      } else {
        alert('Nepodařilo se uložit nastavení');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Nepodařilo se uložit nastavení');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nastavení společnosti</h1>
        <p className="text-gray-600 mt-1">Upravte informace o společnosti</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Název společnosti *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresa *
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Země *
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              required
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IČO *
            </label>
            <input
              type="text"
              value={formData.ico}
              onChange={(e) => setFormData({ ...formData, ico: e.target.value })}
              required
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DIČ *
            </label>
            <input
              type="text"
              value={formData.dic}
              onChange={(e) => setFormData({ ...formData, dic: e.target.value })}
              required
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefon *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webová stránka *
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              required
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
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
            href="/admin/settings"
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Zrušit
          </Link>
        </div>
      </form>
    </div>
  );
}

