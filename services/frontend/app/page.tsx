import Link from 'next/link';
import { productsApi, Product } from '@/lib/api/products';
import ProductCard from '@/components/ProductCard';

// Product type with optional rating for display purposes
type ProductWithRating = Product & { rating?: number };

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
      {/* Hero Banner - flipflop style */}
      <section className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-5xl">
            <div className="inline-block bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 px-5 py-2 rounded-full text-sm font-bold mb-6 shadow-lg animate-pulse">
              ✨ NOVÁ SEZÓNA
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight drop-shadow-lg">
              Objevte nejlepší produkty
              <br />
              <span className="bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-300 bg-clip-text text-transparent">
                za skvělé ceny
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-blue-50 leading-relaxed max-w-2xl">
              Široký výběr kvalitních produktů s rychlým doručením a zárukou spokojenosti
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/products"
                className="inline-block bg-white text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 text-center shadow-xl"
              >
                Nakupovat nyní →
              </Link>
              <Link
                href="/products?search=akce"
                className="inline-block bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/20 hover:border-white/50 transition-all duration-300 text-center shadow-lg"
              >
                Akční nabídky
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent"></div>
      </section>

      {/* Categories Quick Access */}
      <section className="py-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {['Elektronika', 'Móda', 'Sport', 'Domácnost', 'Krása', 'Knihy'].map((category) => (
              <Link
                key={category}
                href={`/products?category=${category.toLowerCase()}`}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 text-gray-700 hover:text-blue-700 font-semibold transition-all duration-300 text-sm md:text-base shadow-sm hover:shadow-md transform hover:scale-105 border border-gray-200 hover:border-blue-200"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products - Professional Product Cards */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2">
                Doporučené produkty
              </h2>
              <p className="text-gray-600 text-lg">Nejlepší výběr pro vás</p>
            </div>
            <Link 
              href="/products"
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-2 text-lg group"
            >
              Zobrazit vše
              <span className="transform group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
          
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
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

      {/* Special Offers Banner */}
      <section className="py-16 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-lg">Speciální nabídka!</h2>
          <p className="text-xl md:text-2xl mb-8 text-orange-50">Doprava zdarma při nákupu nad 1 000 Kč</p>
          <Link
            href="/products"
            className="inline-block bg-white text-orange-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-orange-50 transition-all duration-300 shadow-2xl transform hover:scale-105"
          >
            Využít nabídku
          </Link>
        </div>
      </section>

      {/* Features Section - Compact */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="flex items-start gap-5 p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-5xl filter drop-shadow-md">🚀</div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">Rychlé doručení</h3>
                <p className="text-slate-600">Expresní doručení do 24 hodin po celé ČR</p>
              </div>
            </div>
            <div className="flex items-start gap-5 p-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-5xl filter drop-shadow-md">🔒</div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">Bezpečné platby</h3>
                <p className="text-slate-600">Zabezpečené platby přes PayU a karty</p>
              </div>
            </div>
            <div className="flex items-start gap-5 p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-5xl filter drop-shadow-md">💬</div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">AI Asistent</h3>
                <p className="text-slate-600">Inteligentní pomoc s výběrem produktů</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
