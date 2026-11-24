// Test stand-in for vite-plugin-pwa's virtual module, which only exists inside a Vite build.
export function useRegisterSW() {
  const noop = () => undefined;
  return {
    offlineReady: [false, noop] as const,
    needRefresh: [false, noop] as const,
    updateServiceWorker: async () => undefined,
  };
}
