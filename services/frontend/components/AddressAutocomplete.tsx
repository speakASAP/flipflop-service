"use client";

import { useEffect, useRef, useState } from 'react';

export type AddressValue = {
  street: string;
  city: string;
  postalCode: string;
  country?: string;
};

type AddressSuggestion = AddressValue & {
  id: string;
  label: string;
  provider?: string;
};

type SuggestResponse = {
  success: boolean;
  configured: boolean;
  suggestions?: AddressSuggestion[];
};

type AddressAutocompleteProps = {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  required?: boolean;
  countryOptions?: string[];
  showCountry?: boolean;
  streetLabel?: string;
  cityLabel?: string;
  postalCodeLabel?: string;
  countryLabel?: string;
  wrapperClassName?: string;
  fieldClassName?: string;
  inputClassName?: string;
  selectClassName?: string;
};

const defaultInputClass = 'w-full border border-neutral-300 px-4 py-3 focus:border-pink-600 focus:outline-none';
const defaultFieldClass = 'block font-semibold';
const minQueryLength = 3;

export default function AddressAutocomplete({
  value,
  onChange,
  required = false,
  countryOptions = ['Česká republika', 'Slovensko'],
  showCountry = true,
  streetLabel = 'Ulice a č. p.',
  cityLabel = 'Město',
  postalCodeLabel = 'PSČ',
  countryLabel = 'Země',
  wrapperClassName = 'grid gap-5 md:grid-cols-2',
  fieldClassName = defaultFieldClass,
  inputClassName = defaultInputClass,
  selectClassName = defaultInputClass,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value.street || '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const lastSelectedRef = useRef('');

  useEffect(() => {
    if (value.street !== query && value.street !== lastSelectedRef.current) {
      setQuery(value.street || '');
    }
  }, [value.street, query]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minQueryLength || trimmed === lastSelectedRef.current) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/address-autocomplete?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as SuggestResponse;
        setConfigured(data.configured !== false);
        setSuggestions(data.success ? data.suggestions || [] : []);
        setOpen(Boolean(data.success && data.suggestions && data.suggestions.length > 0));
      } catch (error) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 280);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  const patch = (patchValue: Partial<AddressValue>) => onChange({ ...value, ...patchValue });

  const selectSuggestion = async (suggestion: AddressSuggestion) => {
    let selected = suggestion;
    if ((!suggestion.street || !suggestion.city || !suggestion.postalCode) && suggestion.id) {
      try {
        const response = await fetch(`/api/address-autocomplete?placeId=${encodeURIComponent(suggestion.id)}`);
        const data = (await response.json()) as { success: boolean; suggestion?: AddressSuggestion };
        if (data.success && data.suggestion) {
          selected = data.suggestion;
        }
      } catch {
        selected = suggestion;
      }
    }

    const nextStreet = selected.street || selected.label || query;
    lastSelectedRef.current = nextStreet;
    setQuery(nextStreet);
    setSuggestions([]);
    setOpen(false);
    onChange({
      street: nextStreet,
      city: selected.city || value.city,
      postalCode: selected.postalCode || value.postalCode,
      country: selected.country || value.country || countryOptions[0],
    });
  };

  return (
    <div className={wrapperClassName}>
      <label className={`${fieldClassName} md:col-span-2`}>
        {streetLabel}{required ? ' *' : ''}
        <span className="relative mt-2 block">
          <input
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              lastSelectedRef.current = '';
              setQuery(next);
              patch({ street: next });
            }}
            onFocus={() => setOpen(suggestions.length > 0)}
            autoComplete="street-address"
            className={`${inputClassName} pr-10`}
          />
          {loading && <span className="absolute right-3 top-3 text-sm font-black text-neutral-400">...</span>}
          {open && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-auto border border-neutral-200 bg-white shadow-xl">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  className="block w-full border-b border-neutral-100 px-4 py-3 text-left hover:bg-pink-50 focus:bg-pink-50 focus:outline-none"
                >
                  <span className="block font-bold text-neutral-950">{suggestion.label}</span>
                  {(suggestion.postalCode || suggestion.city) && (
                    <span className="text-sm font-semibold text-neutral-500">
                      {[suggestion.postalCode, suggestion.city].filter(Boolean).join(' ')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </span>
        {!configured && <span className="mt-2 block text-sm font-semibold text-neutral-500">Adresní našeptávač čeká na konfiguraci mapového klíče.</span>}
      </label>
      <label className={fieldClassName}>
        {cityLabel}{required ? ' *' : ''}
        <input value={value.city} onChange={(event) => patch({ city: event.target.value })} autoComplete="address-level2" className={`mt-2 ${inputClassName}`} />
      </label>
      <label className={fieldClassName}>
        {postalCodeLabel}{required ? ' *' : ''}
        <input value={value.postalCode} onChange={(event) => patch({ postalCode: event.target.value })} autoComplete="postal-code" className={`mt-2 ${inputClassName}`} />
      </label>
      {showCountry && (
        <label className={fieldClassName}>
          {countryLabel}
          <select value={value.country || countryOptions[0]} onChange={(event) => patch({ country: event.target.value })} autoComplete="country-name" className={`mt-2 ${selectClassName}`}>
            {countryOptions.map((country) => <option key={country}>{country}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
