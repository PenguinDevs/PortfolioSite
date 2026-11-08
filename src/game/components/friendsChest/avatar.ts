// successful loads are remembered so reopening the chest shows the icons straight away.
// failures aren't, so the flaky avatar api gets another go
const loadedAvatars = new Set<string>();
const pendingAvatars = new Map<string, Promise<void>>();

export function isAvatarLoaded(url: string): boolean {
  return loadedAvatars.has(url);
}

// crossOrigin is left unset on purpose, the icon is only displayed so no CORS headers are needed
export function loadAvatar(url: string): Promise<void> {
  const pending = pendingAvatars.get(url);
  if (pending) return pending;

  // executor form rather than Promise.withResolvers, which older Safari versions lack
  const promise = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error(`avatar has no size: ${url}`));
        return;
      }
      loadedAvatars.add(url);
      resolve();
    };
    img.onerror = () => reject(new Error(`avatar failed to load: ${url}`));
    img.src = url;
  }).finally(() => pendingAvatars.delete(url));

  pendingAvatars.set(url, promise);
  return promise;
}
