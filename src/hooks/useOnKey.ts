import { useEffect } from 'react';

export function useOnKey(key: string, callback: (e: KeyboardEvent) => void) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === key) {
        callback(e);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [key, callback]);
}
