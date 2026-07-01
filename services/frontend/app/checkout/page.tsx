'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cart } from '@/lib/api/cart';
import { CreateGuestOrderData, ordersApi } from '@/lib/api/orders';
import { clearGuestCart, getGuestCart, GuestCart } from '@/lib/guest-cart';
import { useAuth } from '@/contexts/AuthContext';
import { buildHostedPasswordResetUrl } from '@/lib/auth/hosted-auth';
import AddressAutocomplete, { AddressValue } from '@/components/AddressAutocomplete';

type CheckoutStep = 'delivery' | 'details';
type CartView = Cart | GuestCart;
type PaymentMethod = 'invoice' | 'webpay' | 'stripe' | 'paypal' | 'payu';

type FormState = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  note: string;
  createAccount: boolean;
  marketingConsent: boolean;
  differentDelivery: boolean;
  deliveryStreet: string;
  deliveryCity: string;
  deliveryPostalCode: string;
};

const DELIVERY_OPTIONS = [
  { id: 'store', label: 'Osobní odběr na prodejně FlipFlop', price: 0, meta: 'Připraveno po potvrzení skladové dostupnosti' },
  { id: 'pickup-box', label: 'Výdejní boxy a odběrná místa', price: 59, meta: 'Síť partnerských výdejních míst' },
  { id: 'prague-time', label: 'Doručení Praha na čas', price: 89, meta: 'Kurýr v domluveném časovém okně' },
  { id: 'zasilkovna-address', label: 'Zásilkovna na adresu', price: 89, meta: 'Klasická česká doručovací volba' },
  { id: 'dpd', label: 'Přepravní služba DPD', price: 89, meta: 'Standardní balíková doprava' },
];

const CHECKOUT_DETAILS_PATH = '/checkout?step=details';

const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; label: string; price: number; meta: string }> = [
  { id: 'webpay', label: 'Platební karta GP WebPay', price: 0, meta: 'Přesměrování na platební bránu' },
  { id: 'stripe', label: 'Platební karta Stripe', price: 0, meta: 'Mezinárodní platební karta' },
  { id: 'paypal', label: 'PayPal', price: 0, meta: 'PayPal účet nebo karta' },
  { id: 'payu', label: 'PayU', price: 0, meta: 'Online platba přes PayU' },
];

const initialForm: FormState = {
  email: '', phone: '', firstName: '', lastName: '', street: '', city: '', postalCode: '', country: 'Česká republika', note: '',
  createAccount: false, marketingConsent: false, differentDelivery: false, deliveryStreet: '', deliveryCity: '', deliveryPostalCode: '',
};

const getCartProduct = (item: any) => item.product || item.products;
const money = (value: number) => Math.round(value).toLocaleString('cs-CZ') + ' Kč';

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartView | null>(null);
  const [step, setStep] = useState<CheckoutStep>('delivery');
  const [deliveryMethod, setDeliveryMethod] = useState('zasilkovna-address');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('webpay');
  const [differentDay, setDifferentDay] = useState(false);
  const [requestedDate, setRequestedDate] = useState('');
  const operatorTip = 0;
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const loginRedirectHref = '/login?redirect=' + encodeURIComponent(CHECKOUT_DETAILS_PATH);
  const registerRedirectHref = '/register?redirect=' + encodeURIComponent(CHECKOUT_DETAILS_PATH);
  const [passwordResetHref, setPasswordResetHref] = useState(loginRedirectHref);

  useEffect(() => {
    if (authLoading) return;
    setCart(getGuestCart());
    setPasswordResetHref(buildHostedPasswordResetUrl(CHECKOUT_DETAILS_PATH));
    if (new URLSearchParams(window.location.search).get('step') === 'details') {
      setStep('details');
    }
    if (user) {
      setForm((current) => ({ ...current, email: user.email || current.email, phone: user.phone || current.phone, firstName: user.firstName || current.firstName, lastName: user.lastName || current.lastName }));
    }
  }, [authLoading, user]);

  const selectedDelivery = DELIVERY_OPTIONS.find((option) => option.id === deliveryMethod) || DELIVERY_OPTIONS[0];
  const selectedPayment = PAYMENT_OPTIONS.find((option) => option.id === paymentMethod) || PAYMENT_OPTIONS[0];
  const subtotal = cart?.total || 0;
  const total = subtotal + selectedDelivery.price + selectedPayment.price + operatorTip;
  const validContact = Boolean(form.email.includes('@') && form.phone.trim() && form.firstName.trim() && form.lastName.trim());
  const validAddress = Boolean(form.street.trim() && form.city.trim() && form.postalCode.trim());
  const orderItems = useMemo(() => cart?.items.map((item: any) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })) || [], [cart]);

  const updateForm = (key: keyof FormState, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const updateBillingAddress = (address: AddressValue) => setForm((current) => ({
    ...current,
    street: address.street,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country || current.country,
  }));

  const updateDeliveryAddress = (address: AddressValue) => setForm((current) => ({
    ...current,
    deliveryStreet: address.street,
    deliveryCity: address.city,
    deliveryPostalCode: address.postalCode,
  }));

  const goToDelivery = () => {
    setError(null);
    setStep('delivery');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToDetails = () => {
    setError(null);
    if (!deliveryMethod) { setError('Není vybrán způsob dopravy.'); return; }
    if (!paymentMethod) { setError('Není vybrán způsob platby.'); return; }
    setStep('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitOrder = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!cart || cart.items.length === 0) { setError('Košík je prázdný.'); return; }
    if (!validContact) { setError('Doplňte prosím kontaktní údaje.'); return; }
    if (!validAddress) { setError('Doplňte prosím fakturační adresu.'); return; }
    setProcessing(true);
    try {
      const billingAddress = { firstName: form.firstName, lastName: form.lastName, street: form.street, city: form.city, postalCode: form.postalCode, country: form.country, phone: form.phone };
      const payload: CreateGuestOrderData = {
        email: form.email, phone: form.phone, wantsAccount: form.createAccount, marketingConsent: form.marketingConsent, billingAddress,
        deliveryAddress: form.differentDelivery ? { ...billingAddress, street: form.deliveryStreet, city: form.deliveryCity, postalCode: form.deliveryPostalCode } : billingAddress,
        items: orderItems, paymentMethod, deliveryMethod, expeditionMethod: 'standard-one-shipment', wantsDifferentDeliveryDay: differentDay,
        requestedDeliveryDate: differentDay ? requestedDate : undefined, operatorTip, notes: form.note,
      };
      const response = await ordersApi.createGuestOrder(payload);
      if (!response.success || !response.data) { setError(response.error?.message || 'Nepodařilo se vytvořit objednávku.'); return; }
      clearGuestCart();
      if (response.data.redirectUrl) window.location.href = response.data.redirectUrl;
      else router.push('/payment-result?status=created&orderId=' + encodeURIComponent(response.data.order.id));
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || !cart) return <main className="min-h-screen bg-white px-6 py-12">Načítání pokladny...</main>;
  if (cart.items.length === 0) return <main className="min-h-screen bg-white px-6 py-16"><div className="mx-auto max-w-2xl text-center"><h1 className="text-4xl font-black text-neutral-950">Váš košík je prázdný</h1><Link href="/products" className="mt-8 inline-flex bg-green-600 px-8 py-4 font-bold text-white hover:bg-green-700">Prohlédnout produkty</Link></div></main>;

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <header className="border-b border-neutral-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7"><Link href="/" className="text-3xl font-black tracking-tight">FlipFlop</Link><div className="hidden items-center gap-6 text-sm font-semibold text-neutral-700 md:flex"><span>Stačí písknout</span><span>+420 720 780 770</span><span>obchod@flipflop.cz</span></div></div></header>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-12 grid grid-cols-3 items-start gap-3">
          <CheckoutStepButton mark="1." label="Obsah košíku" active={false} available onClick={() => router.push('/cart')} />
          <CheckoutStepButton mark="2." label="Doprava a platba" active={step === 'delivery'} available onClick={goToDelivery} />
          <CheckoutStepButton mark="3." label="Doručovací údaje" active={step === 'details'} available={step === 'details'} />
        </div>
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <section>
            {step === 'delivery' ? (
              <div className="space-y-10">
                <section className={'border p-6 ' + (error?.includes('dopravy') ? 'border-red-500' : 'border-neutral-200')}><h1 className="mb-6 text-4xl font-black">Doprava</h1>{error?.includes('dopravy') && <p className="mb-4 font-semibold text-red-600">{error}</p>}<div className="divide-y divide-neutral-200">{DELIVERY_OPTIONS.map((option) => <ChoiceRow key={option.id} checked={deliveryMethod === option.id} onChange={() => setDeliveryMethod(option.id)} label={option.label} meta={option.meta} price={option.price === 0 ? 'ZDARMA' : money(option.price)} />)}</div></section>
                <section className="border border-neutral-200 p-6"><h2 className="mb-5 text-3xl font-black">Platba</h2><div className="divide-y divide-neutral-200">{PAYMENT_OPTIONS.map((option) => <ChoiceRow key={option.id} checked={paymentMethod === option.id} onChange={() => setPaymentMethod(option.id)} label={option.label} meta={option.meta} price={option.price === 0 ? 'ZDARMA' : money(option.price)} />)}</div></section>
                <section className="space-y-5"><label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={differentDay} onChange={(event) => setDifferentDay(event.target.checked)} className="h-5 w-5 accent-pink-600" />Chci zboží doručit v jiný den</label>{differentDay && <input type="date" value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} className="border border-neutral-300 px-4 py-3" />}<div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => router.push('/cart')} className="border border-neutral-300 px-8 py-5 text-xl font-black text-neutral-800 hover:border-pink-600 hover:text-pink-700">← Vrátit se na předchozí krok</button><button onClick={goToDetails} className="bg-green-600 px-8 py-5 text-xl font-black text-white hover:bg-green-700">Pokračovat na osobní údaje →</button></div></section>
              </div>
            ) : (
              <form onSubmit={submitOrder} className="space-y-10"><button type="button" onClick={goToDelivery} className="border border-neutral-300 px-6 py-3 font-black text-neutral-800 hover:border-pink-600 hover:text-pink-700">← Vrátit se na předchozí krok</button><section className="border border-neutral-200 p-8"><div className="mb-8 rounded border border-neutral-200 bg-neutral-50 p-5"><p className="font-semibold">Máte již u nás účet?</p><p><Link href={loginRedirectHref} className="font-bold text-pink-700 underline">Přihlaste se</Link><span> a my vše předvyplníme přímo tady.</span></p><p className="mt-3 text-sm font-semibold text-neutral-700">Pokud účet nenajdete, zůstanete v tomto kroku checkoutu. Můžete pokračovat jako host, <Link href={registerRedirectHref} className="text-pink-700 underline">zaregistrovat se</Link> nebo <a href={passwordResetHref} className="text-pink-700 underline">obnovit přístup</a>.</p></div><h1 className="mb-6 text-4xl font-black">Kontaktní údaje</h1><div className="grid gap-5 md:grid-cols-2"><Field label="E-mail *" value={form.email} valid={form.email.includes('@')} onChange={(value) => updateForm('email', value)} /><Field label="Telefon *" value={form.phone} valid={Boolean(form.phone.trim())} onChange={(value) => updateForm('phone', value)} /><Field label="Jméno *" value={form.firstName} valid={Boolean(form.firstName.trim())} onChange={(value) => updateForm('firstName', value)} /><Field label="Příjmení *" value={form.lastName} valid={Boolean(form.lastName.trim())} onChange={(value) => updateForm('lastName', value)} /></div><h2 className="mb-6 mt-10 text-3xl font-black">Fakturační údaje</h2><AddressAutocomplete required value={{ street: form.street, city: form.city, postalCode: form.postalCode, country: form.country }} onChange={updateBillingAddress} /><label className="mt-8 flex items-center gap-3 font-semibold"><input type="checkbox" checked={form.differentDelivery} onChange={(event) => updateForm('differentDelivery', event.target.checked)} className="h-5 w-5 accent-pink-600" />Dodací údaje jsou jiné než fakturační</label>{form.differentDelivery && <AddressAutocomplete value={{ street: form.deliveryStreet, city: form.deliveryCity, postalCode: form.deliveryPostalCode, country: form.country }} onChange={updateDeliveryAddress} showCountry={false} streetLabel="Dodací ulice" cityLabel="Dodací město" postalCodeLabel="Dodací PSČ" wrapperClassName="mt-5 grid gap-5 md:grid-cols-3" />}<label className="mt-8 block font-semibold">Poznámka<textarea value={form.note} onChange={(event) => updateForm('note', event.target.value)} className="mt-2 h-24 w-full border border-neutral-300 px-4 py-3" /></label><label className="mt-8 flex items-center gap-3 font-semibold"><input type="checkbox" checked={form.createAccount} onChange={(event) => updateForm('createAccount', event.target.checked)} className="h-5 w-5 accent-pink-600" />Chci vytvořit účet</label>{form.createAccount && <p className="mt-3 max-w-xl text-sm font-semibold text-neutral-600">Po dokončení objednávky vám pošleme e-mail pro bezpečné dokončení účtu. Objednávka tím není podmíněná.</p>}<label className="mt-8 flex items-start gap-3 font-semibold"><input type="checkbox" checked={form.marketingConsent} onChange={(event) => updateForm('marketingConsent', event.target.checked)} className="mt-1 h-5 w-5 accent-pink-600" /><span>Souhlasím se zasíláním marketingových informací a nabídek e-mailem.</span></label></section>{error && <div className="border border-red-500 bg-red-50 px-5 py-4 font-semibold text-red-700">{error}</div>}<button disabled={processing} className="w-full bg-green-600 px-8 py-5 text-xl font-black text-white hover:bg-green-700 disabled:opacity-60">{processing ? 'Odesíláme objednávku...' : 'Odeslat objednávku s povinností platby →'}</button><p className="text-center text-sm text-neutral-500">Dokončením objednávky souhlasíte s obchodními podmínkami a zpracováním osobních údajů.</p><button type="button" onClick={goToDelivery} className="font-bold underline">← Vrátit se na předchozí krok</button></form>
            )}
          </section>
          <aside className="lg:sticky lg:top-6 lg:self-start"><div className="border border-neutral-200 bg-white p-6 shadow-lg"><h2 className="mb-6 text-3xl font-black">Souhrn objednávky</h2><div className="space-y-5">{cart.items.map((item: any) => { const product = getCartProduct(item); return <div key={item.id} className="flex gap-4 border-b border-neutral-200 pb-4"><div className="h-16 w-16 overflow-hidden border border-neutral-200 bg-neutral-50">{product?.mainImageUrl ? <img src={product.mainImageUrl} alt={product.name} className="h-full w-full object-cover" /> : null}</div><div className="flex-1"><p className="text-sm font-black">{product?.name || 'Produkt'}</p><p className="text-sm text-neutral-500">{item.quantity}×</p></div><p className="font-bold">{money(item.price * item.quantity)}</p></div>; })}<SummaryRow label="Produkty v košíku v hodnotě" value={money(subtotal)} /><SummaryRow label={selectedDelivery.label} value={selectedDelivery.price === 0 ? 'ZDARMA' : money(selectedDelivery.price)} />{operatorTip > 0 && <SummaryRow label="Poděkování expedici" value={money(operatorTip)} />}<div className="border-t border-neutral-200 pt-5"><div className="flex justify-between text-2xl font-black text-pink-700"><span>Celkem k zaplacení</span><span>{money(total)}</span></div></div></div></div></aside>
        </div>
      </div>
    </main>
  );
}

function ChoiceRow({ checked, onChange, label, meta, price }: { checked: boolean; onChange: () => void; label: string; meta: string; price: string }) {
  return <label className="flex cursor-pointer items-center gap-4 py-5"><input type="radio" checked={checked} onChange={onChange} className="h-5 w-5 accent-pink-600" /><span className="flex-1"><span className="block text-lg font-bold">{label}</span><span className="text-sm text-neutral-500">{meta}</span></span><span className="font-black text-green-600">{price}</span></label>;
}

function CheckoutStepButton({ mark, label, active, available, onClick }: { mark: string; label: string; active: boolean; available: boolean; onClick?: () => void }) {
  const circleClass = active || available ? 'bg-green-600' : 'bg-neutral-400';
  const labelClass = active || available ? 'text-green-600' : 'text-neutral-800';
  const content = <><div className={'mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white ' + circleClass}>{mark}</div><div className={'mt-3 text-sm font-black md:text-base ' + labelClass}>{label}</div></>;
  if (!available || !onClick) return <div className="text-center" aria-current={active ? 'step' : undefined}>{content}</div>;
  return <button type="button" onClick={onClick} className="w-full text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-4" aria-current={active ? 'step' : undefined}>{content}</button>;
}

function Field({ label, value, valid, onChange }: { label: string; value: string; valid: boolean; onChange: (value: string) => void }) {
  return <label className="block font-semibold">{label}<span className="relative mt-2 block"><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full border border-neutral-300 px-4 py-3 pr-10 focus:border-pink-600 focus:outline-none" />{valid && <span className="absolute right-3 top-3 font-black text-green-600">✓</span>}</span></label>;
}


function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="font-semibold text-neutral-700">{label}</span><span className="font-black">{value}</span></div>;
}
