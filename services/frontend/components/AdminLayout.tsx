'use client';

/**
 * Admin Layout Component
 * Provides sidebar navigation and layout for admin pages
 */

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const menuItems = [
    {
      title: 'Přehled',
      href: '/admin',
      icon: '📊',
    },
    {
      title: 'Produkty',
      href: '/admin/products',
      icon: '📦',
    },
    {
      title: 'Objednávky',
      href: '/admin/orders',
      icon: '🛒',
    },
    {
      title: 'Uživatelé',
      href: '/admin/users',
      icon: '👥',
    },
    {
      title: 'Analytika',
      href: '/admin/analytics',
      icon: '📈',
    },
    {
      title: 'Nastavení',
      href: '/admin/settings',
      icon: '⚙️',
      children: [
        { title: 'Společnost', href: '/admin/settings/company' },
        { title: 'Systém', href: '/admin/settings/system' },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <Link href="/admin" className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Admin Panel
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl text-gray-600 hover:bg-blue-50 transition-all"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-md border-r border-gray-200 shadow-xl transition-transform duration-300 ease-in-out`}
        >
          <div className="h-full flex flex-col">
            {/* Logo/Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
              <Link href="/admin" className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-white">
                  ⚡ Admin Panel
                </span>
              </Link>
              <p className="text-sm text-blue-100 mt-1">
                flipflop.statex.cz
              </p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive(item.href)
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg transform scale-105'
                          : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-md'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.title}</span>
                    </Link>
                    {item.children && isActive(item.href) && (
                      <ul className="ml-4 mt-2 space-y-1 border-l-2 border-blue-200 pl-4">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`block px-4 py-2 rounded-lg transition-all ${
                                pathname === child.href
                                  ? 'bg-blue-100 text-blue-700 font-semibold shadow-sm'
                                  : 'text-gray-600 hover:bg-blue-50'
                              }`}
                            >
                              {child.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            {/* User info and logout */}
            <div className="p-4 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50/50">
              <div className="mb-4 p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                <p className="text-sm font-bold text-gray-900">
                  {user?.firstName || user?.email}
                </p>
                <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/"
                  className="text-center px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-blue-200 hover:border-blue-300"
                >
                  🏠 Zpět na web
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-all border border-red-200 hover:border-red-300"
                >
                  🚪 Odhlásit
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-0 min-h-screen">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

