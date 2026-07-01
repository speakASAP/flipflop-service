import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type NormalizedAddress = {
  id: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  provider: 'google-places';
};

const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.ADDRESS_AUTOCOMPLETE_API_KEY || '';
const countries = (process.env.ADDRESS_AUTOCOMPLETE_COUNTRIES || 'cz,sk')
  .split(',')
  .map((country) => country.trim().toLowerCase())
  .filter(Boolean);

const googleHeaders = {
  'Content-Type': 'application/json',
  'X-Goog-Api-Key': apiKey,
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, max-age=300' } });
}

function componentValue(components: GoogleAddressComponent[], type: string) {
  const found = components.find((component) => component.types?.includes(type));
  return found?.longText || found?.shortText || '';
}

function normalizeDetails(place: any): NormalizedAddress {
  const components = Array.isArray(place.addressComponents) ? place.addressComponents : [];
  const route = componentValue(components, 'route');
  const streetNumber = componentValue(components, 'street_number');
  const premise = componentValue(components, 'premise');
  const city = componentValue(components, 'locality')
    || componentValue(components, 'postal_town')
    || componentValue(components, 'administrative_area_level_2')
    || componentValue(components, 'administrative_area_level_1');
  const postalCode = componentValue(components, 'postal_code');
  const countryCode = componentValue(components, 'country');
  const street = [route, streetNumber || premise].filter(Boolean).join(' ').trim();
  const label = place.formattedAddress || [street, postalCode, city].filter(Boolean).join(', ');

  return {
    id: place.id || '',
    label,
    street: street || label,
    city,
    postalCode,
    country: countryCode || 'Česká republika',
    provider: 'google-places',
  };
}

async function getPlaceDetails(placeId: string) {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      ...googleHeaders,
      'X-Goog-FieldMask': 'id,formattedAddress,addressComponents',
    },
  });

  if (!response.ok) {
    return json({ success: false, configured: true, suggestions: [] }, response.status >= 500 ? 502 : 200);
  }

  const place = await response.json();
  return json({ success: true, configured: true, suggestion: normalizeDetails(place) });
}

async function getPredictions(input: string) {
  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      ...googleHeaders,
      'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: countries,
      languageCode: 'cs',
      regionCode: countries[0] || 'cz',
    }),
  });

  if (!response.ok) {
    return json({ success: false, configured: true, suggestions: [] }, response.status >= 500 ? 502 : 200);
  }

  const data = await response.json();
  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions
        .map((suggestion: any) => suggestion.placePrediction)
        .filter(Boolean)
        .map((prediction: any) => ({
          id: prediction.placeId || prediction.place || prediction.text?.text,
          label: prediction.text?.text || '',
          street: '',
          city: '',
          postalCode: '',
          country: '',
          provider: 'google-places',
        }))
        .filter((prediction: any) => prediction.id && prediction.label)
    : [];

  return json({ success: true, configured: true, suggestions });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const placeId = (searchParams.get('placeId') || '').trim();
  const query = (searchParams.get('q') || '').trim();

  if (!apiKey) {
    return json({ success: true, configured: false, suggestions: [] });
  }

  if (placeId) {
    return getPlaceDetails(placeId);
  }

  if (query.length < 3) {
    return json({ success: true, configured: true, suggestions: [] });
  }

  return getPredictions(query.slice(0, 120));
}
