'use client';

/**
 * System Settings Page
 */

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api/admin';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const response = await adminApi.getAdminSettings();
      if (response.success && response.data) {
        // Settings loaded but not displayed (available via API only)
        console.log('System settings loaded');
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
        <h1 className="text-3xl font-bold text-gray-900">Systémová nastavení</h1>
        <p className="text-gray-600 mt-1">Konfigurace systému</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">
          Systémová nastavení jsou momentálně dostupná pouze přes API. Pro
          pokročilou konfiguraci kontaktujte administrátora.
        </p>
        <div className="mt-4">
          <Link
            href="/admin/settings"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Zpět na nastavení
          </Link>
        </div>
      </div>
    </div>
  );
}

