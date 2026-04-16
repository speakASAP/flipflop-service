# Cursor Task: SEO Meta Tags — product pages (T10)

## Goal

Add Next.js 14 metadata exports to the two product pages so every product URL emits a unique `<title>`, `<meta name="description">`, and Open Graph tags.

---

## Files to modify

1. `flipflop-service/services/frontend/app/products/[id]/page.tsx`
2. `flipflop-service/services/frontend/app/products/page.tsx`

Do NOT modify `app/layout.tsx` or any other file.

---

## Change 1 — Product detail page: add generateMetadata()

In `app/products/[id]/page.tsx`:

1. Add `import type { Metadata } from 'next';` at the top if not already present.
2. Add the following export **directly before** `export default async function ProductPage`:

```ts
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const response = await productsApi.getProduct(params.id);
  if (!response.success || !response.data) {
    return { title: 'Produkt nenalezen | flipflop.alfares.cz' };
  }
  const product = response.data;
  const description = product.description
    ? product.description.slice(0, 160)
    : `Koupit ${product.name} za ${product.price.toLocaleString('cs-CZ')} Kč. Rychlé doručení po celé ČR.`;
  const title = product.brand
    ? `${product.brand} ${product.name} | flipflop.alfares.cz`
    : `${product.name} | flipflop.alfares.cz`;
  const image = product.mainImageUrl ?? product.imageUrls?.[0] ?? product.images?.[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'cs_CZ',
      siteName: 'flipflop.alfares.cz',
      ...(image ? { images: [{ url: image, width: 800, height: 800, alt: product.name }] } : {}),
    },
  };
}
```

---

## Change 2 — Product listing page: add static metadata

In `app/products/page.tsx`:

1. Add `import type { Metadata } from 'next';` at the top if not already present.
2. Add the following **after the imports, before the `ProductsPageProps` interface**:

```ts
export const metadata: Metadata = {
  title: 'Všechny produkty | flipflop.alfares.cz',
  description: 'Prohlédněte si náš kompletní sortiment. Rychlé doručení, snadné platby, kvalitní zboží za skvělé ceny.',
  openGraph: {
    title: 'Všechny produkty | flipflop.alfares.cz',
    description: 'Prohlédněte si náš kompletní sortiment.',
    type: 'website',
    locale: 'cs_CZ',
    siteName: 'flipflop.alfares.cz',
  },
};
```

---

## Verify

```bash
cd flipflop-service/services/frontend && npx tsc --noEmit 2>&1 | tail -5
```

Expected output: exit 0 with no errors.

```bash
grep -n "generateMetadata" flipflop-service/services/frontend/app/products/\[id\]/page.tsx
grep -n "export const metadata" flipflop-service/services/frontend/app/products/page.tsx
```

Expected: one match each.
