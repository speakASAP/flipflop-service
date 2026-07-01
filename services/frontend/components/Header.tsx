'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getGuestCart, GUEST_CART_UPDATED_EVENT } from '@/lib/guest-cart';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [guestItemCount, setGuestItemCount] = useState(0);
  const router = useRouter();
  const cartItemCount = isAuthenticated ? 0 : guestItemCount;

  useEffect(() => {
    const refreshGuestCartCount = () => {
      setGuestItemCount(getGuestCart().itemCount);
    };

    refreshGuestCartCount();
    window.addEventListener('storage', refreshGuestCartCount);
    window.addEventListener(GUEST_CART_UPDATED_EVENT, refreshGuestCartCount);

    return () => {
      window.removeEventListener('storage', refreshGuestCartCount);
      window.removeEventListener(GUEST_CART_UPDATED_EVENT, refreshGuestCartCount);
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3 py-2">
          <Link href="/" className="text-xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent transition-all md:text-2xl">
            flipflop.alfares.cz
          </Link>

          {/* Search Bar - Desktop */}
          <form action="/products" method="get" className="hidden md:flex flex-1 max-w-xl mx-4">
            <input
              type="text"
              name="search"
              placeholder="Hledat produkty..."
              className="h-10 flex-1 border border-gray-300 px-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              className="h-10 bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              🔍 Hledat
            </button>
          </form>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link href="/cart" className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <span className="text-xl">🛒</span>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartItemCount}</span>
                </Link>
                <Link href="/orders" className="text-slate-700 font-medium hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50 hidden sm:block">
                  Objednávky
                </Link>
                {user?.isAdmin && (
                  <Link href="/admin" className="text-purple-700 font-medium hover:text-purple-800 transition-colors px-3 py-2 rounded-lg hover:bg-purple-50 hidden sm:block border border-purple-300">
                    Admin
                  </Link>
                )}
                <Link href="/profile" className="text-slate-700 font-medium hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50 hidden sm:block">
                  {user?.firstName || 'Profil'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Odhlásit
                </button>
              </>
            ) : (
              <>
                <Link href="/cart" className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <span className="text-xl">🛒</span>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartItemCount}</span>
                </Link>
                <Link href="/login" className="px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:text-blue-600">
                  Přihlásit
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Registrovat
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Navigation Bar */}
        <nav className="flex items-center gap-2 overflow-x-auto border-t border-gray-100 py-1.5 text-sm">
          <Link href="/products" className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1 font-semibold text-slate-700 transition hover:text-blue-600">
            <span className="text-lg">📦</span>
            <span>Všechny produkty</span>
          </Link>
          <Link href="/products?category=elektronika" className="hidden whitespace-nowrap px-2 py-1 font-semibold text-slate-700 transition hover:text-blue-600 md:block">
            Elektronika
          </Link>
          <Link href="/products?category=moda" className="hidden whitespace-nowrap px-2 py-1 font-semibold text-slate-700 transition hover:text-blue-600 md:block">
            Móda
          </Link>
          <Link href="/products?category=sport" className="hidden whitespace-nowrap px-2 py-1 font-semibold text-slate-700 transition hover:text-blue-600 md:block">
            Sport
          </Link>
        </nav>

        {/* Mobile Search */}
        <form action="/products" method="get" className="pb-2 md:hidden">
          <div className="flex gap-2">
            <input
              type="text"
              name="search"
              placeholder="Hledat produkty..."
              className="h-10 min-w-0 flex-1 border border-gray-300 px-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              className="h-10 bg-blue-600 px-4 text-white transition hover:bg-blue-700"
            >
              🔍
            </button>
          </div>
        </form>
      </div>
    </header>
  );
}
