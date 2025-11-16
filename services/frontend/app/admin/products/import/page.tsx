'use client';

/**
 * CSV Import Page
 * Manual CSV import for products
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

interface FieldMapping {
  sku: string;
  name: string;
  shortDescription?: string;
  description?: string;
  price: string;
  compareAtPrice?: string;
  brand?: string;
  manufacturer?: string;
  stockQuantity?: string;
  isActive?: string;
  mainImageUrl?: string;
  imageUrls?: string;
  categories?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

export default function CsvImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: string[][];
  } | null>(null);
  const [importing, setImporting] = useState(false);
  interface ImportError {
    row: number;
    error: string;
    data: Record<string, unknown>;
  }

  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: ImportError[];
    skipped: number;
  } | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({
    sku: '',
    name: '',
    price: '',
  });
  const [options, setOptions] = useState({
    defaultProfitMargin: 0,
    updateExisting: false,
    skipErrors: true,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(null);
    setImportResult(null);

    // Read file content
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);

      // Auto-preview
      try {
        const response = await adminApi.previewCsv(content);
        if (response.success && response.data) {
          setPreview(response.data);
          // Auto-detect field mappings for bizbox.cz format
          autoDetectMappings(response.data.headers);
        }
      } catch (error) {
        console.error('Failed to preview CSV:', error);
        alert('Nepodařilo se načíst CSV soubor');
      }
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const autoDetectMappings = (headers: string[]) => {
    const mapping: FieldMapping = {
      sku: '',
      name: '',
      price: '',
    };

    // Common field name patterns
    const patterns: Record<string, string[]> = {
      sku: ['code', 'sku', 'product_code', 'id'],
      name: ['name:cs', 'name', 'product_name', 'title', 'title:cs'],
      shortDescription: ['shortDescription:cs', 'short_description', 'shortDescription'],
      description: ['description:cs', 'description', 'desc'],
      price: ['purchasePriceGrossPrice', 'price', 'purchasePrice', 'cost', 'price:cz'],
      compareAtPrice: ['compareAtPrice', 'original_price', 'list_price'],
      brand: ['brand', 'manufacturer_brand'],
      manufacturer: ['manufacturer', 'producer'],
      stockQuantity: ['stock', 'quantity', 'stockQuantity', 'inventory'],
      isActive: ['active', 'isActive', 'enabled', 'status'],
      mainImageUrl: ['bigImages', 'mainImageUrl', 'image', 'main_image'],
      imageUrls: ['galleryImages', 'images', 'imageUrls', 'product_images'],
      categories: ['categoriesSingle', 'defaultCategory', 'category', 'categories'],
      seoTitle: ['seoTitle:cs', 'seoTitle', 'meta_title'],
      seoDescription: ['seoDescription:cs', 'seoDescription', 'meta_description'],
      seoKeywords: ['seoKeywords:cs', 'seoKeywords', 'meta_keywords'],
    };

    for (const [field, patternsList] of Object.entries(patterns)) {
      for (const pattern of patternsList) {
        const found = headers.find((h) =>
          h.toLowerCase().includes(pattern.toLowerCase())
        );
        if (found) {
          (mapping as unknown as Record<string, string>)[field] = found;
          break;
        }
      }
    }

    setFieldMapping(mapping);
  };


  const handleImport = async () => {
    if (!csvContent) {
      alert('Nejprve nahrajte CSV soubor');
      return;
    }

    if (!fieldMapping.sku || !fieldMapping.name || !fieldMapping.price) {
      alert('Musíte namapovat alespoň pole: SKU, Název a Cena');
      return;
    }

    if (
      !confirm(
        `Opravdu chcete importovat produkty? ${options.updateExisting ? 'Existující produkty budou aktualizovány.' : 'Existující produkty budou přeskočeny.'}`
      )
    ) {
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const response = await adminApi.importCsv({
        csvContent,
        fieldMapping: fieldMapping as unknown as Record<string, string>,
        defaultProfitMargin: options.defaultProfitMargin || undefined,
        updateExisting: options.updateExisting,
        skipErrors: options.skipErrors,
      });

      if (response.success && response.data) {
        setImportResult(response.data);
        if (response.data.success > 0) {
          setTimeout(() => {
            router.push('/admin/products');
          }, 3000);
        }
      } else {
        alert('Import selhal');
      }
    } catch (error) {
      console.error('Failed to import CSV:', error);
      const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba';
      alert(`Import selhal: ${errorMessage}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Import produktů z CSV</h1>
          <p className="text-gray-600 mt-1">
            Nahrajte CSV soubor a namapujte pole pro import produktů
          </p>
        </div>
        <Link
          href="/admin/products"
          className="text-gray-600 hover:text-gray-700 font-medium"
        >
          ← Zpět na seznam
        </Link>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          1. Nahrajte CSV soubor
        </h2>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Vybraný soubor: <strong>{file.name}</strong> (
            {(file.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      {/* Field Mapping */}
      {preview && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            2. Namapujte pole
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Dostupné sloupce v CSV: {preview.headers.join(', ')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU * (např. code)
              </label>
              <select
                value={fieldMapping.sku}
                onChange={(e) =>
                  setFieldMapping({ ...fieldMapping, sku: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Vyberte sloupec</option>
                {preview.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Název * (např. name:cs)
              </label>
              <select
                value={fieldMapping.name}
                onChange={(e) =>
                  setFieldMapping({ ...fieldMapping, name: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Vyberte sloupec</option>
                {preview.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cena * (např. purchasePriceGrossPrice)
              </label>
              <select
                value={fieldMapping.price}
                onChange={(e) =>
                  setFieldMapping({ ...fieldMapping, price: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Vyberte sloupec</option>
                {preview.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Krátký popis (např. shortDescription:cs)
              </label>
              <select
                value={fieldMapping.shortDescription || ''}
                onChange={(e) =>
                  setFieldMapping({
                    ...fieldMapping,
                    shortDescription: e.target.value || undefined,
                  })
                }
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Nepoužít</option>
                {preview.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Popis (např. description:cs)
              </label>
              <select
                value={fieldMapping.description || ''}
                onChange={(e) =>
                  setFieldMapping({
                    ...fieldMapping,
                    description: e.target.value || undefined,
                  })
                }
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Nepoužít</option>
                {preview.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Značka (např. brand)
              </label>
              <select
                value={fieldMapping.brand || ''}
                onChange={(e) =>
                  setFieldMapping({
                    ...fieldMapping,
                    brand: e.target.value || undefined,
                  })
                }
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Nepoužít</option>
                {preview.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Výrobce (např. manufacturer)
              </label>
              <select
                value={fieldMapping.manufacturer || ''}
                onChange={(e) =>
                  setFieldMapping({
                    ...fieldMapping,
                    manufacturer: e.target.value || undefined,
                  })
                }
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Nepoužít</option>
                {preview.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skladem (např. stock)
              </label>
              <select
                value={fieldMapping.stockQuantity || ''}
                onChange={(e) =>
                  setFieldMapping({
                    ...fieldMapping,
                    stockQuantity: e.target.value || undefined,
                  })
                }
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Nepoužít</option>
                {preview.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hlavní obrázek (např. bigImages)
              </label>
              <select
                value={fieldMapping.mainImageUrl || ''}
                onChange={(e) =>
                  setFieldMapping({
                    ...fieldMapping,
                    mainImageUrl: e.target.value || undefined,
                  })
                }
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Nepoužít</option>
                {preview.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategorie (např. categoriesSingle)
              </label>
              <select
                value={fieldMapping.categories || ''}
                onChange={(e) =>
                  setFieldMapping({
                    ...fieldMapping,
                    categories: e.target.value || undefined,
                  })
                }
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Nepoužít</option>
                {preview.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Import Options */}
      {preview && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            3. Nastavení importu
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marže (%) - přidá se k nákupní ceně
              </label>
              <input
                type="number"
                step="0.1"
                value={options.defaultProfitMargin}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    defaultProfitMargin: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                placeholder="0"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="updateExisting"
                checked={options.updateExisting}
                onChange={(e) =>
                  setOptions({ ...options, updateExisting: e.target.checked })
                }
                className="mr-2"
              />
              <label htmlFor="updateExisting" className="text-sm text-gray-700">
                Aktualizovat existující produkty (podle SKU)
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="skipErrors"
                checked={options.skipErrors}
                onChange={(e) =>
                  setOptions({ ...options, skipErrors: e.target.checked })
                }
                className="mr-2"
              />
              <label htmlFor="skipErrors" className="text-sm text-gray-700">
                Přeskočit chyby a pokračovat
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && preview.rows.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Náhled dat (prvních 5 řádků)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {preview.headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="px-3 py-2 text-gray-900 max-w-xs truncate"
                        title={cell}
                      >
                        {cell.substring(0, 50)}
                        {cell.length > 50 ? '...' : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Výsledek importu
          </h2>
          <div className="space-y-2">
            <p className="text-green-600 font-medium">
              Úspěšně importováno: {importResult.success} produktů
            </p>
            {importResult.skipped > 0 && (
              <p className="text-yellow-600">
                Přeskočeno: {importResult.skipped} produktů
              </p>
            )}
            {importResult.failed > 0 && (
              <p className="text-red-600">
                Selhalo: {importResult.failed} produktů
              </p>
            )}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-4">
                <p className="font-medium text-gray-900 mb-2">Chyby:</p>
                <div className="max-h-60 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((error, idx) => (
                    <p key={idx} className="text-sm text-red-600">
                      Řádek {error.row}: {error.error}
                    </p>
                  ))}
                  {importResult.errors.length > 10 && (
                    <p className="text-sm text-gray-500">
                      ... a dalších {importResult.errors.length - 10} chyb
                    </p>
                  )}
                </div>
              </div>
            )}
            {importResult.success > 0 && (
              <p className="text-sm text-gray-600 mt-4">
                Přesměrování na seznam produktů za 3 sekundy...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleImport}
          disabled={!preview || importing || !fieldMapping.sku || !fieldMapping.name || !fieldMapping.price}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {importing ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Importuji...
            </span>
          ) : (
            'Importovat produkty'
          )}
        </button>
        <Link
          href="/admin/products"
          className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Zrušit
        </Link>
      </div>
    </div>
  );
}

