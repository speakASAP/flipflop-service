'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all drop-shadow-sm">
            flipflop.statex.cz
          </Link>

          {/* Search Bar - Desktop */}
          <form action="/products" method="get" className="hidden md:flex flex-1 max-w-2xl mx-8">
            <input
              type="text"
              name="search"
              placeholder="Hledat produkty..."
              className="flex-1 border-2 border-gray-300 rounded-l-xl px-5 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-sm"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-r-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
            >
              🔍 Hledat
            </button>
          </form>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/cart" className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <span className="text-2xl">🛒</span>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">0</span>
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
                  <span className="text-2xl">🛒</span>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">0</span>
                </Link>
                <Link href="/login" className="text-slate-700 font-medium hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">
                  Přihlásit
                </Link>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-bold hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  Registrovat
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Navigation Bar */}
        <nav className="flex items-center gap-4 py-3 border-t border-gray-200">
          <Link href="/products" className="text-slate-700 font-semibold hover:text-blue-600 transition-all px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 flex items-center gap-2 border border-transparent hover:border-blue-200">
            <span className="text-lg">📦</span>
            <span>Všechny produkty</span>
          </Link>
          <Link href="/products?category=elektronika" className="text-slate-700 font-semibold hover:text-blue-600 transition-all px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hidden md:block border border-transparent hover:border-blue-200">
            Elektronika
          </Link>
          <Link href="/products?category=moda" className="text-slate-700 font-semibold hover:text-blue-600 transition-all px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hidden md:block border border-transparent hover:border-blue-200">
            Móda
          </Link>
          <Link href="/products?category=sport" className="text-slate-700 font-semibold hover:text-blue-600 transition-all px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hidden md:block border border-transparent hover:border-blue-200">
            Sport
          </Link>
        </nav>

        {/* Mobile Search */}
        <form action="/products" method="get" className="md:hidden pb-3">
          <div className="flex gap-2">
            <input
              type="text"
              name="search"
              placeholder="Hledat produkty..."
              className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-sm"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
            >
              🔍
            </button>
          </div>
        </form>
      </div>
    </header>
  );
}

