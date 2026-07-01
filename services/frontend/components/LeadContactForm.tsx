'use client';

import { FormEvent, useState } from 'react';
import { leadsApi } from '@/lib/api/leads';
import { useAuth } from '@/contexts/AuthContext';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export default function LeadContactForm({ submitLabel = 'Odeslat poptavku' }: { submitLabel?: string }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);
  const hasProfileEmail = Boolean(user?.email);
  const hasProfilePhone = Boolean(user?.phone);
  const showEmailInput = !isAuthenticated || !hasProfileEmail;
  const showPhoneInput = !isAuthenticated || !hasProfilePhone;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!marketingConsent) {
      setState('error');
      setError('Bez souhlasu nemuzeme poptavku odeslat.');
      return;
    }

    const contactEmail = user?.email || email;
    const contactPhone = user?.phone || phone;

    if (!contactEmail || !contactPhone) {
      setState('error');
      setError('Doplnte prosim e-mail a telefon, abychom vas mohli kontaktovat.');
      return;
    }

    setState('submitting');
    const response = await leadsApi.submitContact({
      email: contactEmail,
      phone: contactPhone,
      message,
      marketingConsent,
    });

    if (response.success) {
      setState('success');
      setEmail('');
      setPhone('');
      setMessage('');
      setMarketingConsent(true);
      return;
    }

    setState('error');
    setError(response.error?.message || 'Poptavku se nepodarilo odeslat.');
  }

  const isSubmitting = state === 'submitting';

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {showEmailInput && (
        <div>
          <label htmlFor="lead-email" className="block text-sm font-semibold text-slate-700 mb-2">
            E-mail
          </label>
          <input
            id="lead-email"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            placeholder="vas@email.cz"
          />
        </div>
      )}

      {showPhoneInput && (
        <div>
          <label htmlFor="lead-phone" className="block text-sm font-semibold text-slate-700 mb-2">
            Telefon
          </label>
          <input
            id="lead-phone"
            type="tel"
            required
            maxLength={40}
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            placeholder="+420 123 456 789"
          />
        </div>
      )}

      {isAuthenticated && hasProfileEmail && hasProfilePhone && (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          Kontaktni udaje pouzijeme z vaseho uctu.
        </p>
      )}

      <div>
        <label htmlFor="lead-message" className="block text-sm font-semibold text-slate-700 mb-2">
          Co hledate?
        </label>
        <textarea
          id="lead-message"
          required
          maxLength={1200}
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          placeholder="Napiste nam, s cim vam mame pomoct."
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={(event) => setMarketingConsent(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span>
          Souhlasim, aby me FlipFlop kontaktoval e-mailem nebo telefonem k teto poptavce a navazujici nabidce.
        </span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting || loading}
        className="w-full rounded-xl bg-slate-900 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? 'Odesilam...' : submitLabel}
      </button>

      {state === 'success' && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Dekujeme. Poptavku jsme prijali a ozveme se vam e-mailem nebo telefonem.
        </p>
      )}

      {state === 'error' && error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
