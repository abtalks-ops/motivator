import { useRegisterSW } from 'virtual:pwa-register/react';

/** Shows a small banner when a new version is ready or when the app works offline. */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="toast" role="status">
      <span>{needRefresh ? 'A new version is ready.' : 'Ready to work offline.'}</span>
      {needRefresh && (
        <button type="button" onClick={() => void updateServiceWorker(true)}>
          Update
        </button>
      )}
      <button
        type="button"
        className="secondary"
        onClick={() => {
          setOfflineReady(false);
          setNeedRefresh(false);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
