'use client';

import { useState } from 'react';
import type { ShoppableItem } from '@/lib/shoppable/types';

function formatPrice(price: number | null, currency: string | null): string | null {
  if (price === null) return null;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency ?? 'USD',
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price);
  } catch {
    return `$${price}`;
  }
}

/**
 * One shoppable item's card: top recommendation, entire card is a link to
 * the merchant product page (new tab). Thumbnail prefers the locally cached
 * copy, falls back to the merchant CDN, then to a text-only card.
 */
export function ProductCard({
  item,
  cardRef,
  onHoverChange,
}: {
  item: ShoppableItem;
  cardRef: (el: HTMLAnchorElement | null) => void;
  onHoverChange: (hovering: boolean) => void;
}) {
  const product = item.products[0];
  const [src, setSrc] = useState<string | null>(product.localImage ?? product.image);
  const price = formatPrice(product.price, product.currency);

  return (
    <a
      ref={cardRef}
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
      className="pointer-events-auto flex w-full max-w-sm items-center gap-4 rounded-xl border border-neutral-200 bg-white/85 p-3 shadow-sm backdrop-blur transition-colors hover:border-neutral-900"
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={product.name}
          className="h-20 w-16 shrink-0 rounded-md bg-neutral-100 object-cover"
          onError={() => setSrc(src === product.localImage && product.image ? product.image : null)}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
          {item.label}
        </div>
        <div className="mt-1 truncate text-sm text-neutral-900">{product.name}</div>
        <div className="mt-1 flex items-baseline gap-2 font-mono text-[11px] tracking-wide text-neutral-600">
          {product.brand && <span className="truncate">{product.brand}</span>}
          {price && <span>{price}</span>}
        </div>
        {product.merchant && (
          <div className="mt-1 truncate font-mono text-[10px] tracking-[0.15em] text-neutral-400">
            {product.merchant} ↗
          </div>
        )}
      </div>
    </a>
  );
}
