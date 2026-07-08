export interface NormalizedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FitScanBound {
  id: string;
  kind: string;
  label: string;
  rect: NormalizedRect;
  anchor: { x: number; y: number };
  confidence: number;
  derivedFrom: string[];
}

export interface FitScanMatch {
  matchKind: 'best' | 'exact';
  label: string;
  rawType: string;
  title: string;
  source: string | null;
  link: string;
  thumbnail: string | null;
  image: string | null;
  price: string | null;
  stock: string | null;
  condition: string | null;
}

export interface FitScanSearchPayload {
  ok: boolean;
  imageUrl?: string;
  match?: FitScanMatch;
  error?: {
    code: string;
    message: string;
  };
}
