'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { getVisitorInterestSummary, recordVisitorActivity } from '@/lib/visitor-activity';
import type { Product } from '@/lib/api/products';

type AssistantProduct = Pick<Product, 'id' | 'name' | 'price' | 'brand' | 'stockQuantity'>;

type AssistantMessage = {
  role: 'assistant' | 'visitor';
  text: string;
};

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const scoreProduct = (product: AssistantProduct, signals: string[]) => {
  const haystack = normalize([product.name, product.brand || ''].join(' '));
  return signals.reduce((score, signal) => {
    const words = normalize(signal).split(/\s+/).filter((word) => word.length > 2);
    return score + words.filter((word) => haystack.includes(word)).length;
  }, 0);
};

export default function ShoppingAssistant({ products }: { products: AssistantProduct[] }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      text: 'Napište, co hledáte. Použiju vaše poslední hledání, prohlížené produkty a aktuální nabídku na stránce.',
    },
  ]);

  const summary = useMemo(() => getVisitorInterestSummary(), [open, messages.length]);
  const signals = [...summary.searches, ...summary.productViews, ...summary.clicks];
  const recommendations = [...products]
    .map((product) => ({ product, score: scoreProduct(product, [...signals, input]) }))
    .sort((first, second) => second.score - first.score || Number(second.product.stockQuantity || 0) - Number(first.product.stockQuantity || 0))
    .slice(0, 3);

  function buildAnswer() {
    const best = recommendations.filter((item) => item.score > 0).map((item) => item.product);
    const fallback = recommendations.map((item) => item.product);
    const selected = best.length ? best : fallback;
    const historyLine = summary.searches.length
      ? `Vidím, že jste hledali: ${summary.searches.join(', ')}.`
      : 'Zatím nevidím konkrétní vyhledávání, proto vybírám z aktuálně doporučených produktů.';
    const productLine = selected.length
      ? `Doporučil bych: ${selected.map((product) => `${product.name} (${Number(product.price).toLocaleString('cs-CZ')} Kč)`).join('; ')}.`
      : 'Aktuálně nemám načtené produkty pro doporučení.';

    return `${historyLine} ${productLine} Pokud chcete, napište rozpočet nebo účel a zúžím výběr.`;
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;

    recordVisitorActivity({ type: 'assistant_message', label: question });
    setMessages((current) => [
      ...current,
      { role: 'visitor', text: question },
      { role: 'assistant', text: buildAnswer() },
    ]);
    setInput('');
  }

  return (
    <section id="ai-asistent" className="border-y border-slate-200 bg-white py-8">
      <div className="container mx-auto grid gap-5 px-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-700">AI asistent</p>
          <h2 className="text-2xl font-extrabold text-slate-950 md:text-3xl">Poradíme podle toho, co hledáte</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Asistent v této návštěvě ukládá hledání, zobrazené produkty a kliknutí v prohlížeči, aby doporučení navázalo na váš zájem.
          </p>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="mt-4 inline-flex items-center bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {open ? 'Zavřít asistenta' : 'Otevřít asistenta'}
          </button>
        </div>

        <div className="border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-slate-800">Aktuální signály</div>
          <div className="space-y-1 text-xs text-slate-600">
            <p>Session: {summary.sessionId.slice(0, 18)}...</p>
            <p>Hledání: {summary.searches.length ? summary.searches.join(', ') : 'zatím žádné'}</p>
            <p>Produktové stránky: {summary.productViews.length ? summary.productViews.join(', ') : 'zatím žádné'}</p>
          </div>
        </div>

        {open && (
          <div className="lg:col-span-2">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="border border-slate-200 bg-white p-4 shadow-sm">
                <div className="max-h-64 space-y-3 overflow-auto pr-1">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={message.role === 'assistant' ? 'bg-blue-50 p-3 text-sm text-slate-800' : 'bg-slate-900 p-3 text-sm text-white'}
                    >
                      {message.text}
                    </div>
                  ))}
                </div>
                <form onSubmit={submitMessage} className="mt-4 flex gap-2">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    className="min-w-0 flex-1 border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Např. dárek do 1000 Kč, něco do kanceláře..."
                  />
                  <button type="submit" className="bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                    Poslat
                  </button>
                </form>
              </div>

              <div className="border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 text-sm font-bold text-slate-900">Doporučení</div>
                <div className="space-y-3">
                  {recommendations.map(({ product }) => (
                    <Link key={product.id} href={`/products/${product.id}`} className="block border border-slate-200 p-3 text-sm hover:border-blue-300 hover:bg-blue-50">
                      <span className="block font-bold text-slate-900">{product.name}</span>
                      <span className="text-blue-700">{Number(product.price).toLocaleString('cs-CZ')} Kč</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
