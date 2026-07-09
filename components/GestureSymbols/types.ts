export type SymbolKind = 'cross' | 'ring' | 'square' | 'star';

export const SYMBOL_ORDER: readonly SymbolKind[] = ['cross', 'ring', 'square', 'star'];

/** 'dark-on-light' = black text on white field (default). */
export type Polarity = 'dark-on-light' | 'light-on-dark';

/** What caused the most recent symbol change; the renderer styles transitions per source. */
export type TransitionSource = 'initial' | 'gesture' | 'swipe' | 'keyboard';

export interface SymbolState {
  symbol: SymbolKind;
  polarity: Polarity;
  source: TransitionSource;
  /** Bumped on every symbol change so the renderer can restart a transition even on re-selection. */
  changeCount: number;
}

export const INITIAL_SYMBOL_STATE: SymbolState = {
  symbol: 'cross',
  polarity: 'dark-on-light',
  source: 'initial',
  changeCount: 0,
};
