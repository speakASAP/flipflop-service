'use client';

import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nastavení</h1>
        <p className="text-gray-600 mt-1">Správa nastavení systému</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/settings/company"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Nastavení společnosti
          </h2>
          <p className="text-gray-600">
            Upravte informace o společnosti, IČO, DIČ a kontaktní údaje
          </p>
        </Link>

        <Link
          href="/admin/settings/system"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Systémová nastavení
          </h2>
          <p className="text-gray-600">
            Konfigurace systému a funkčních prvků
          </p>
        </Link>
      </div>
    </div>
  );
}

