'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await authApi.updateProfile(formData);
      if (response.success) {
        setMessage('Profil byl úspěšně aktualizován');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Nepodařilo se aktualizovat profil');
      }
    } catch {
      setMessage('Došlo k chybě');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">⏳</div>
          <p className="text-xl font-semibold text-gray-600">Načítání...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-slate-900">Můj profil</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-2xl font-extrabold mb-6 text-slate-900">👤 Osobní údaje</h2>

              {message && (
                <div
                  className={`mb-6 p-4 rounded-xl font-semibold ${
                    message.includes('úspěšně')
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 text-green-700'
                      : 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 text-red-700'
                  }`}
                >
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-gray-700 mb-2 font-semibold">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full border-2 border-gray-300 rounded-xl px-5 py-3 bg-gray-100 text-gray-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-gray-700 mb-2 font-semibold">
                      Jméno
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full border-2 border-gray-300 rounded-xl px-5 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-gray-700 mb-2 font-semibold">
                      Příjmení
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full border-2 border-gray-300 rounded-xl px-5 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-gray-700 mb-2 font-semibold">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-300 rounded-xl px-5 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="+420 123 456 789"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {saving ? '⏳ Ukládání...' : '💾 Uložit změny'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 sticky top-4">
              <h2 className="text-xl font-extrabold mb-6 text-slate-900">🔗 Rychlé odkazy</h2>
              <div className="space-y-3">
                <Link
                  href="/orders"
                  className="block bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-5 py-3 font-semibold text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all shadow-sm hover:shadow-md"
                >
                  📦 Moje objednávky
                </Link>
                <Link
                  href="/profile/addresses"
                  className="block bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-5 py-3 font-semibold text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all shadow-sm hover:shadow-md"
                >
                  📍 Dodací adresy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

