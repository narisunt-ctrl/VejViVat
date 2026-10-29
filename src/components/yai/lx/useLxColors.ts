import { useEffect, useState } from 'react';
import { useYai } from '../../../services/yai/yaiStore';

/** Resolve lx-* tokens to colour strings for SVG chart libraries (re-read when the theme changes) */
export function useLxColors() {
  const theme = useYai((s) => s.settings.theme ?? 'dark');
  const [c, setC] = useState({ chart: '#2BA88E', muted: '#A7B8B2', line: '#2A403B', ink: '#F7F6F1', surface: '#172825' });
  useEffect(() => {
    const el = document.querySelector('.lx');
    if (!el) return;
    const css = getComputedStyle(el);
    const v = (k: string) => `rgb(${css.getPropertyValue(`--lx-${k}`).trim()})`;
    setC({ chart: v('chart'), muted: v('muted'), line: v('line'), ink: v('ink'), surface: v('surface') });
  }, [theme]);
  return c;
}
