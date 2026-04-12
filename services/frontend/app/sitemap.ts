import { MetadataRoute } from 'next';

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'https://flipflop.statex.cz';

const getApiBaseUrl = () =>
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  `http://localhost:${process.env.API_GATEWAY_PORT || '3011'}/api`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE_URL = getBaseUrl().replace(/\/$/, '');
  const API_BASE = getApiBaseUrl().replace(/\/$/, '');

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/products?limit=500`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json: unknown = await res.json();
      let products: Array<{ id: string; updatedAt?: string }> = [];
      if (
        json &&
        typeof json === 'object' &&
        'data' in json &&
        json.data &&
        typeof json.data === 'object' &&
        'items' in json.data &&
        Array.isArray((json.data as { items: unknown }).items)
      ) {
        products = (json.data as { items: Array<{ id: string; updatedAt?: string }> })
          .items;
      } else if (json && typeof json === 'object' && 'items' in json && Array.isArray((json as { items: unknown }).items)) {
        products = (json as { items: Array<{ id: string; updatedAt?: string }> }).items;
      }
      productRoutes = products.map((p) => ({
        url: `${BASE_URL}/products/${p.id}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch {
    // non-blocking — static routes still valid if product fetch fails
  }

  return [...staticRoutes, ...productRoutes];
}
