'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Copies text to the clipboard and reports the outcome; `copied` resets after `resetMs`. */
export function useCopyText(resetMs = 1400) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setFailed(false);
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetMs);
      } catch {
        setCopied(false);
        setFailed(true);
      }
    },
    [resetMs],
  );

  return { copied, failed, copy };
}
