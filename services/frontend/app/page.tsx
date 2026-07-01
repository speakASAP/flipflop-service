import Link from 'next/link';
import { productsApi, Product } from '@/lib/api/products';
import ProductCard from '@/components/ProductCard';
import LeadContactForm from '@/components/LeadContactForm';
import ShoppingAssistant from '@/components/ShoppingAssistant';

export const dynamic = 'force-dynamic';

// Product type with optional rating for display purposes
type ProductWithRating = Product & { rating?: number };

const categoryLinks = [
  { name: 'Elektronika', slug: 'elektronika' },
  { name: 'Móda', slug: 'moda' },
  { name: 'Sport', slug: 'sport' },
  { name: 'Domácnost', slug: 'domacnost' },
  { name: 'Krása', slug: 'krasa' },
  { name: 'Knihy', slug: 'knihy' },
];

export default async function HomePage() {
  // Fetch featured products from catalog and warehouse services
  // includeWarehouse is now default true, so real stock data will be included
  let products: ProductWithRating[] = [];
  let hasError = false;

  try {
    const productsResponse = await productsApi.getProducts({ limit: 8, includeWarehouse: true });
    if (productsResponse.success && productsResponse.data?.items) {
      products = productsResponse.data.items;
    } else {
      // Log error but don't throw - show empty state instead
      console.error('Failed to fetch products:', productsResponse.error);
      hasError = true;
    }
  } catch (error) {
    // Log error but don't throw - show empty state instead
    console.error('Error fetching products:', error);
    hasError = true;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Categories Quick Access */}
      <section className="border-b border-gray-100 bg-white py-4 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            {categoryLinks.map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${category.slug}`}
                className="whitespace-nowrap border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products - Professional Product Cards */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-8 md:py-10">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h1 className="mb-1 text-3xl font-extrabold text-slate-900 md:text-4xl">
                Doporučené produkty
              </h1>
              <p className="text-sm text-gray-600 md:text-base">První výběr dostupných produktů</p>
            </div>
            <Link 
              href="/products"
              className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 md:text-base group"
            >
              Zobrazit vše
              <span className="transform group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
          
          {products.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
              {products.map((product: ProductWithRating) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Žádné produkty k dispozici</h3>
              <p className="text-gray-600 mb-6">
                {hasError 
                  ? 'Nepodařilo se načíst produkty. Zkuste to prosím později.'
                  : 'V současné době nemáme žádné produkty v nabídce.'}
              </p>
              <Link
                href="/products"
                className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Procházet produkty
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Promotional Products Offer */}
      <section className="bg-white pb-8">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-rose-600 to-orange-500 px-5 py-8 text-white shadow-2xl shadow-red-200 md:px-8 md:py-10">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-yellow-300/30 blur-2xl"></div>
            <div className="absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-white/15 blur-3xl"></div>
            <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="mb-3 inline-flex bg-white px-4 py-2 text-sm font-black uppercase tracking-wide text-red-700 shadow-lg">
                  Akční produkty
                </p>
                <h2 className="mb-3 text-3xl font-extrabold leading-tight drop-shadow md:text-5xl">
                  Speciální nabídka týdne
                </h2>
                <p className="max-w-2xl text-lg font-semibold leading-relaxed text-red-50 md:text-xl">
                  Vyberte si z akčních produktů a získejte dopravu zdarma při nákupu nad 1 000 Kč.
                </p>
              </div>
              <div className="border-4 border-white/70 bg-white p-5 text-center text-red-700 shadow-2xl md:p-7">
                <div className="text-sm font-black uppercase tracking-[0.25em] text-orange-500">
                  Dnes výhodně
                </div>
                <div className="mt-3 text-3xl font-black leading-none md:text-4xl">
                  Doprava zdarma
                </div>
                <div className="mt-3 text-lg font-extrabold text-slate-900">
                  při nákupu nad 1 000 Kč
                </div>
                <Link
                  href="/products?search=akce"
                  className="mt-5 inline-flex w-full items-center justify-center bg-red-600 px-5 py-3 text-base font-black text-white shadow-lg transition hover:bg-red-700"
                >
                  Zobrazit akční produkty
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ShoppingAssistant products={products} />

      {/* Contact Lead Form */}
      <section id="kontakt" className="bg-white py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-wide text-blue-600 mb-3">Kontakt</p>
              <h2 className="mb-4 text-3xl font-extrabold text-slate-900 md:text-4xl">
                Potrebujete poradit s vyberem?
              </h2>
              <p className="mb-5 max-w-xl text-base leading-7 text-slate-600">
                Zanechte telefon nebo e-mail. Ozveme se s doporucenim produktu a odpovedi na dotaz.
              </p>
              <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
                <a href="tel:+420720780770" className="border border-slate-300 px-4 py-2 hover:border-blue-300 hover:text-blue-700">+420 720 780 770</a>
                <a href="mailto:obchod@flipflop.cz" className="border border-slate-300 px-4 py-2 hover:border-blue-300 hover:text-blue-700">obchod@flipflop.cz</a>
              </div>
            </div>
            <div className="border border-slate-200 bg-white p-5 shadow-sm">
              <LeadContactForm submitLabel="Zavolejte mi" />
            </div>
          </div>
        </div>
      </section>


      {/* Features Section - Compact */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <Link href="/doprava" className="flex items-start gap-4 border border-blue-100 bg-blue-50 p-5 shadow-sm transition hover:border-blue-200">
              <div className="text-3xl">🚀</div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">Rychlé doručení</h3>
                <p className="text-slate-600">Expresní doručení do 24 hodin po celé ČR</p>
              </div>
            </Link>
            <Link href="/products?assistant=shop" className="flex items-start gap-4 border border-purple-100 bg-purple-50 p-5 shadow-sm transition hover:border-purple-200">
              <div className="text-3xl">💬</div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">AI Asistent</h3>
                <p className="text-slate-600">Inteligentní pomoc s výběrem produktů</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
