export function buildGoogleLensUrl({ apiKey, imageUrl, type }) {
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_lens');
  url.searchParams.set('url', imageUrl);
  if (type) url.searchParams.set('type', type);
  url.searchParams.set('api_key', apiKey);
  return url;
}

function normalizeStock(result) {
  if (typeof result.in_stock === 'boolean') {
    return result.in_stock ? 'In stock' : 'Out of stock';
  }
  return result.stock ?? result.availability ?? result.delivery ?? null;
}

function normalizeSource(result) {
  if (typeof result.source === 'string') return result.source;
  if (typeof result.domain === 'string') return result.domain;
  if (typeof result.source_name === 'string') return result.source_name;
  if (typeof result.link === 'string') {
    try {
      return new URL(result.link).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }
  return null;
}

function normalizePrice(result) {
  if (typeof result.price === 'string') return result.price;
  if (result.price && typeof result.price === 'object') {
    return result.price.extracted_value
      ? `${result.price.currency ?? '$'}${result.price.extracted_value}`
      : result.price.value ?? null;
  }
  if (typeof result.extracted_price === 'number') return `$${result.extracted_price}`;
  return null;
}

function normalizeResult(result, matchKind, rawType) {
  if (!result || typeof result !== 'object') return null;
  const link = result.link ?? result.product_link ?? result.source_link;
  const title = result.title ?? result.name;
  if (typeof link !== 'string' || typeof title !== 'string') return null;
  const source = normalizeSource(result);
  return {
    matchKind,
    label: matchKind === 'exact' ? 'Exact match' : 'Best match',
    rawType,
    title,
    source,
    link,
    thumbnail: result.thumbnail ?? result.image ?? result.serpapi_thumbnail ?? null,
    image: result.image ?? result.thumbnail ?? null,
    price: normalizePrice(result),
    stock: normalizeStock(result),
    condition: result.condition ?? null,
  };
}

function firstUsable(results, matchKind, rawType) {
  if (!Array.isArray(results)) return null;
  for (const result of results) {
    const normalized = normalizeResult(result, matchKind, rawType);
    if (normalized) return normalized;
  }
  return null;
}

export function selectBestLensResult(response) {
  if (!response || typeof response !== 'object') return null;
  return (
    firstUsable(response.product_results, 'best', 'product_results') ??
    firstUsable(response.exact_matches, 'exact', 'exact_matches') ??
    firstUsable(response.visual_matches, 'best', 'visual_matches') ??
    null
  );
}
