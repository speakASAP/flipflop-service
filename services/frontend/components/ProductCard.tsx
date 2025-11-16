'use client';

import Link from 'next/link';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    brand?: string;
    stockQuantity?: number;
    rating?: number;
    mainImageUrl?: string;
    imageUrls?: string[];
    images?: string[];
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement add to cart functionality
    console.log('Adding to cart:', product.id);
  };

  // Generate product image placeholder based on product name
  const getProductImage = () => {
    const name = product.name.toLowerCase();
    if (name.includes('notebook') || name.includes('laptop')) {
      return '💻';
    } else if (name.includes('sluchátka') || name.includes('headphone')) {
      return '🎧';
    } else if (name.includes('telefon') || name.includes('phone')) {
      return '📱';
    } else if (name.includes('boty') || name.includes('shoe')) {
      return '👟';
    } else if (name.includes('hodinky') || name.includes('watch')) {
      return '⌚';
    } else if (name.includes('kávovar') || name.includes('coffee')) {
      return '☕';
    } else if (name.includes('náramek') || name.includes('fitness')) {
      return '⌚';
    } else if (name.includes('tablet')) {
      return '📱';
    }
    return '📦';
  };

  // Color gradients for different product categories
  const getGradient = () => {
    const name = product.name.toLowerCase();
    if (name.includes('notebook') || name.includes('laptop') || name.includes('telefon') || name.includes('tablet')) {
      return 'from-blue-100 via-indigo-50 to-purple-100';
    } else if (name.includes('sluchátka') || name.includes('headphone')) {
      return 'from-pink-100 via-rose-50 to-purple-100';
    } else if (name.includes('boty') || name.includes('shoe')) {
      return 'from-orange-100 via-amber-50 to-yellow-100';
    } else if (name.includes('hodinky') || name.includes('watch') || name.includes('náramek')) {
      return 'from-slate-100 via-gray-50 to-zinc-100';
    } else if (name.includes('kávovar') || name.includes('coffee')) {
      return 'from-amber-100 via-orange-50 to-brown-100';
    }
    return 'from-gray-100 via-slate-50 to-gray-200';
  };

  // Get the main image URL with fallback
  const getMainImageUrl = () => {
    return product.mainImageUrl || 
           product.imageUrls?.[0] || 
           product.images?.[0] || 
           null;
  };

  const mainImageUrl = getMainImageUrl();

  return (
    <Link
      href={`/products/${product.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 hover:border-blue-200"
    >
      {/* Product Image */}
      <div className={`relative aspect-square bg-gradient-to-br ${getGradient()} overflow-hidden`}>
        {mainImageUrl ? (
          <img
            src={mainImageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              // Fallback to emoji if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div className={`absolute inset-0 flex items-center justify-center ${mainImageUrl ? 'hidden' : ''}`}>
          <div className="w-32 h-32 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
            <span className="text-6xl filter drop-shadow-lg">{getProductImage()}</span>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full -ml-12 -mb-12"></div>
        
        {/* Stock Badge */}
        {product.stockQuantity && product.stockQuantity > 0 ? (
          <div className="absolute top-4 left-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm">
            ✓ Skladem
          </div>
        ) : (
          <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-rose-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
            Vyprodáno
          </div>
        )}
        {/* Discount Badge */}
        {product.id === '1' && (
          <div className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
            -20%
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className="p-5">
        {product.brand && (
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">
            {product.brand}
          </p>
        )}
        <h3 className="font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors text-lg leading-tight">
          {product.name}
        </h3>
        
        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex text-yellow-400 text-sm">
              {'★'.repeat(Math.floor(product.rating))}
              {'☆'.repeat(5 - Math.floor(product.rating))}
            </div>
            <span className="text-xs text-gray-600 font-medium">({product.rating})</span>
          </div>
        )}
        
        {/* Price */}
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-2xl font-extrabold text-blue-600">
            {product.price.toLocaleString('cs-CZ')} Kč
          </span>
          {product.id === '1' && (
            <span className="text-sm text-gray-400 line-through font-medium">
              {Math.round(product.price * 1.25).toLocaleString('cs-CZ')} Kč
            </span>
          )}
        </div>
        
        {/* Quick Add Button */}
        <button
          onClick={handleAddToCart}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 text-sm shadow-md hover:shadow-lg transform hover:scale-[1.02]"
        >
          Přidat do košíku
        </button>
      </div>
    </Link>
  );
}

