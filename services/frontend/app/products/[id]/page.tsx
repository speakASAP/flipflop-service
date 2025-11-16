import { productsApi } from '@/lib/api/products';
import { notFound } from 'next/navigation';
import AddToCartButton from '@/components/AddToCartButton';
import Link from 'next/link';
import Image from 'next/image';

interface ProductPageProps {
  params: {
    id: string;
  };
}

// Helper function to get product emoji
const getProductEmoji = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('notebook') || lowerName.includes('laptop')) return '💻';
  if (lowerName.includes('sluchátka') || lowerName.includes('headphone')) return '🎧';
  if (lowerName.includes('telefon') || lowerName.includes('phone')) return '📱';
  if (lowerName.includes('boty') || lowerName.includes('shoe')) return '👟';
  if (lowerName.includes('hodinky') || lowerName.includes('watch')) return '⌚';
  if (lowerName.includes('kávovar') || lowerName.includes('coffee')) return '☕';
  if (lowerName.includes('náramek') || lowerName.includes('fitness')) return '⌚';
  if (lowerName.includes('tablet')) return '📱';
  return '📦';
};

// Helper function to get gradient
const getGradient = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('notebook') || lowerName.includes('laptop') || lowerName.includes('telefon') || lowerName.includes('tablet')) {
    return 'from-blue-100 via-indigo-50 to-purple-100';
  } else if (lowerName.includes('sluchátka') || lowerName.includes('headphone')) {
    return 'from-pink-100 via-rose-50 to-purple-100';
  } else if (lowerName.includes('boty') || lowerName.includes('shoe')) {
    return 'from-orange-100 via-amber-50 to-yellow-100';
  } else if (lowerName.includes('hodinky') || lowerName.includes('watch') || lowerName.includes('náramek')) {
    return 'from-slate-100 via-gray-50 to-zinc-100';
  } else if (lowerName.includes('kávovar') || lowerName.includes('coffee')) {
    return 'from-amber-100 via-orange-50 to-brown-100';
  }
  return 'from-gray-100 via-slate-50 to-gray-200';
};

export default async function ProductPage({ params }: ProductPageProps) {
  const response = await productsApi.getProduct(params.id);

  if (!response.success || !response.data) {
    notFound();
  }

  const product = response.data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link 
          href="/products" 
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6 transition-colors"
        >
          ← Zpět na produkty
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className={`aspect-square bg-gradient-to-br ${getGradient(product.name)} flex items-center justify-center relative overflow-hidden`}>
              {(() => {
                const mainImage = product.mainImageUrl || product.imageUrls?.[0] || product.images?.[0];
                return mainImage ? (
                  <Image
                    src={mainImage}
                    alt={product.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      // Fallback to emoji if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null;
              })()}
              <div className={`absolute inset-0 flex items-center justify-center ${product.mainImageUrl || product.imageUrls?.[0] || product.images?.[0] ? 'hidden' : ''}`}>
                <div className="w-64 h-64 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl flex items-center justify-center">
                  <span className="text-9xl filter drop-shadow-2xl">{getProductEmoji(product.name)}</span>
                </div>
              </div>
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full -mr-24 -mt-24"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/20 rounded-full -ml-20 -mb-20"></div>
              
              {/* Stock Badge */}
              {product.stockQuantity > 0 ? (
                <div className="absolute top-6 left-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl backdrop-blur-sm">
                  ✓ Skladem ({product.stockQuantity} ks)
                </div>
              ) : (
                <div className="absolute top-6 left-6 bg-gradient-to-r from-red-500 to-rose-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl">
                  Vyprodáno
                </div>
              )}
            </div>
            {(product.imageUrls && product.imageUrls.length > 0) || (product.images && product.images.length > 0) ? (
              <div className="grid grid-cols-4 gap-3 p-4">
                {(product.imageUrls || product.images || []).slice(0, 4).map((image, index) => (
                  <div key={index} className="aspect-square rounded-xl border-2 border-gray-200 overflow-hidden relative">
                    <Image
                      src={image}
                      alt={`${product.name} - obrázek ${index + 1}`}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.className = `aspect-square bg-gradient-to-br ${getGradient(product.name)} rounded-xl border-2 border-gray-200 relative`;
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {product.brand && (
                <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-2">
                  {product.brand}
                </p>
              )}
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {product.price.toLocaleString('cs-CZ')} Kč
                </span>
              </div>
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-bold mb-4 text-slate-900">Varianty</h2>
                <div className="space-y-3">
                  {product.variants.map((variant) => (
                    <div key={variant.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50 transition-all">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900">{variant.name}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {variant.price.toLocaleString('cs-CZ')} Kč
                          </p>
                        </div>
                        <div className="text-right">
                          {variant.stockQuantity > 0 ? (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                              Skladem: {variant.stockQuantity}
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                              Vyprodáno
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Cart */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <AddToCartButton productId={product.id} />
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-bold mb-4 text-slate-900">Popis produktu</h2>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        {product.categories && product.categories.length > 0 && (
          <div className="mt-12 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-slate-900">Kategorie</h2>
            <div className="flex flex-wrap gap-3">
              {product.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.name.toLowerCase()}`}
                  className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl font-semibold text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all shadow-sm hover:shadow-md"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
