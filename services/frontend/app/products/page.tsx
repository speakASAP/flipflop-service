import { productsApi, Product } from '@/lib/api/products';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';

interface ProductsPageProps {
  searchParams: {
    search?: string;
    page?: string;
    categoryId?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const page = parseInt(searchParams.page || '1');
  const filters = {
    page,
    limit: 20,
    search: searchParams.search,
    categoryId: searchParams.categoryId,
    minPrice: searchParams.minPrice ? parseFloat(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? parseFloat(searchParams.maxPrice) : undefined,
    includeWarehouse: true, // Always include real warehouse stock data
  };

  const response = await productsApi.getProducts(filters);
  const products = response.success ? response.data?.items || [] : [];
  const pagination = response.success ? response.data?.pagination : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            {searchParams.search ? `Výsledky hledání: "${searchParams.search}"` : 
             searchParams.category ? `Kategorie: ${searchParams.category}` : 
             'Všechny produkty'}
          </h1>
          <p className="text-xl text-blue-50">
            {products.length > 0 
              ? `Našli jsme ${products.length} ${products.length === 1 ? 'produkt' : products.length < 5 ? 'produkty' : 'produktů'}`
              : 'Procházejte naši širokou nabídku'}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <form className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              name="search"
              placeholder="Hledat produkty..."
              defaultValue={searchParams.search}
              className="flex-1 border-2 border-gray-300 rounded-xl px-5 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
            >
              🔍 Hledat
            </button>
          </form>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-12">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mb-8">
                {pagination.hasPrev && (
                  <Link
                    href={`/products?page=${pagination.page - 1}${searchParams.search ? `&search=${searchParams.search}` : ''}${searchParams.category ? `&category=${searchParams.category}` : ''}`}
                    className="px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
                  >
                    ← Předchozí
                  </Link>
                )}
                <span className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg">
                  Stránka {pagination.page} z {pagination.totalPages}
                </span>
                {pagination.hasNext && (
                  <Link
                    href={`/products?page=${pagination.page + 1}${searchParams.search ? `&search=${searchParams.search}` : ''}${searchParams.category ? `&category=${searchParams.category}` : ''}`}
                    className="px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold hover:bg-blue-50 hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
                  >
                    Další →
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Žádné produkty nenalezeny</h2>
            <p className="text-gray-600 mb-6">Zkuste upravit vyhledávací kritéria</p>
            <Link
              href="/products"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Zobrazit všechny produkty
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

