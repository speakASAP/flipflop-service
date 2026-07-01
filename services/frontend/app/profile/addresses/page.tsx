'use client';

import { useEffect, useState } from 'react';
import { addressesApi, DeliveryAddress, CreateAddressData } from '@/lib/api/addresses';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AddressAutocomplete, { AddressValue } from '@/components/AddressAutocomplete';

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateAddressData>({
    firstName: '',
    lastName: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'Czech Republic',
    phone: '',
    isDefault: false,
  });
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadAddresses();
  }, [isAuthenticated, router]);

  const loadAddresses = async () => {
    try {
      const response = await addressesApi.getAddresses();
      if (response.success && response.data) {
        setAddresses(response.data);
      }
    } catch (error) {
      console.error('Failed to load addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await addressesApi.updateAddress(editingId, formData);
      } else {
        await addressesApi.createAddress(formData);
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadAddresses();
    } catch (error) {
      console.error('Failed to save address:', error);
      alert('Nepodařilo se uložit adresu');
    }
  };

  const handleEdit = (address: DeliveryAddress) => {
    setFormData({
      firstName: address.firstName,
      lastName: address.lastName,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || '',
      isDefault: address.isDefault,
    });
    setEditingId(address.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete smazat tuto adresu?')) {
      return;
    }

    try {
      await addressesApi.deleteAddress(id);
      loadAddresses();
    } catch (error) {
      console.error('Failed to delete address:', error);
      alert('Nepodařilo se smazat adresu');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      street: '',
      city: '',
      postalCode: '',
      country: 'Czech Republic',
      phone: '',
      isDefault: false,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleAddressChange = (address: AddressValue) => {
    setFormData((current) => ({
      ...current,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country || current.country,
    }));
  };

  if (loading) {
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900">📍 Dodací adresy</h1>
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            + Přidat adresu
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-extrabold mb-6 text-slate-900">
              {editingId ? '✏️ Upravit adresu' : '➕ Nová adresa'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2 font-semibold">Jméno</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full border-2 border-gray-300 rounded-xl px-5 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2 font-semibold">Příjmení</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full border-2 border-gray-300 rounded-xl px-5 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <AddressAutocomplete
                    required
                    value={{ street: formData.street, city: formData.city, postalCode: formData.postalCode, country: formData.country }}
                    onChange={handleAddressChange}
                    wrapperClassName="grid grid-cols-1 md:grid-cols-2 gap-6"
                    fieldClassName="block text-gray-700 font-semibold"
                    inputClassName="w-full border-2 border-gray-300 rounded-xl px-5 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    selectClassName="w-full border-2 border-gray-300 rounded-xl px-5 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2 font-semibold">Telefon</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-300 rounded-xl px-5 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="+420 123 456 789"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border-2 border-blue-200 cursor-pointer hover:bg-blue-100 transition-all">
                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={formData.isDefault}
                      onChange={handleChange}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="font-semibold text-blue-700">Nastavit jako výchozí adresu</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {editingId ? '💾 Uložit změny' : '➕ Přidat adresu'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  Zrušit
                </button>
              </div>
            </form>
          </div>
        )}

        {addresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((address) => (
              <div key={address.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
                {address.isDefault && (
                  <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs px-3 py-1.5 rounded-full mb-3 inline-block font-bold shadow-md">
                    ⭐ Výchozí adresa
                  </span>
                )}
                <h3 className="font-extrabold text-xl text-slate-900 mb-3">
                  {address.firstName} {address.lastName}
                </h3>
                <div className="space-y-2 text-gray-700 mb-4">
                  <p>{address.street}</p>
                  <p>
                    {address.city}, {address.postalCode}
                  </p>
                  <p>{address.country}</p>
                  {address.phone && (
                    <p className="mt-2">📞 {address.phone}</p>
                  )}
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(address)}
                    className="text-blue-600 hover:text-blue-700 font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-all"
                  >
                    ✏️ Upravit
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="text-red-600 hover:text-red-700 font-semibold px-4 py-2 rounded-xl hover:bg-red-50 transition-all"
                  >
                    🗑️ Smazat
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showForm && (
            <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl shadow-xl p-12">
              <div className="text-8xl mb-6">📍</div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Nemáte žádné dodací adresy</h2>
              <p className="text-xl text-gray-600 mb-8">Přidejte adresu pro rychlejší nákup</p>
              <button
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                  setShowForm(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                + Přidat první adresu
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

