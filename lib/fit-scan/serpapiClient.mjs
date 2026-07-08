import { buildGoogleLensUrl, selectBestLensResult } from './serpapiResults.mjs';

export class FitScanSearchError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = 'FitScanSearchError';
    this.code = code;
    this.status = status;
  }
}

function assertPublicImageUrl(imageUrl) {
  try {
    const url = new URL(imageUrl);
    if (url.protocol === 'https:') return url.toString();
  } catch {
    // fall through
  }
  throw new FitScanSearchError(
    'IMAGE_URL_NOT_PUBLIC',
    'Google Lens requires a public https image URL for the captured crop.',
    400,
  );
}

export function getSerpApiConfig(env = process.env) {
  const apiKey = env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new FitScanSearchError(
      'SERPAPI_NOT_CONFIGURED',
      'SERPAPI_API_KEY is not configured on the server.',
      503,
    );
  }
  return { apiKey };
}

async function requestLens({ imageUrl, apiKey, type, fetchImpl }) {
  const url = buildGoogleLensUrl({ imageUrl, apiKey, type });
  let response;
  try {
    response = await fetchImpl(url, { cache: 'no-store' });
  } catch (err) {
    throw new FitScanSearchError(
      'SERPAPI_REQUEST_FAILED',
      `SerpApi Google Lens request failed: ${err instanceof Error ? err.message : String(err)}`,
      502,
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new FitScanSearchError(
        'SERPAPI_AUTH_FAILED',
        'SerpApi rejected the configured API key.',
        502,
      );
    }
    if (response.status === 429) {
      throw new FitScanSearchError(
        'SERPAPI_RATE_LIMITED',
        'SerpApi rate limited the Google Lens scan.',
        429,
      );
    }
    throw new FitScanSearchError(
      'SERPAPI_REQUEST_FAILED',
      `SerpApi Google Lens returned status ${response.status}.`,
      502,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new FitScanSearchError(
      'SERPAPI_BAD_RESPONSE',
      'SerpApi Google Lens returned a response that could not be parsed.',
      502,
    );
  }
}

export async function searchGoogleLens({ imageUrl, config, fetchImpl = fetch }) {
  const publicImageUrl = assertPublicImageUrl(imageUrl);
  const productResponse = await requestLens({
    imageUrl: publicImageUrl,
    apiKey: config.apiKey,
    type: 'products',
    fetchImpl,
  });
  const productMatch = selectBestLensResult(productResponse);
  if (productMatch) return { match: productMatch, imageUrl: publicImageUrl };

  const broadResponse = await requestLens({
    imageUrl: publicImageUrl,
    apiKey: config.apiKey,
    fetchImpl,
  });
  return {
    match: selectBestLensResult(broadResponse),
    imageUrl: publicImageUrl,
  };
}
