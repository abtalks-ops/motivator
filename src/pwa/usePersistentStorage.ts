import { useEffect, useState } from 'react';

/**
 * Asks the browser to keep this origin's storage (profile, chats, cached models)
 * instead of evicting it under storage pressure.
 * Returns null while unknown or unsupported.
 */
export function usePersistentStorage(): boolean | null {
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void requestPersistentStorage().then((result) => {
      if (!cancelled) setPersisted(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return persisted;
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage?.persist) return null;
  try {
    if (await storage.persisted()) return true;
    return await storage.persist();
  } catch {
    return null;
  }
}
