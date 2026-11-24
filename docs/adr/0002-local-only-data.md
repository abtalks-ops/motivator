# 0002. All user data stays on the device

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

Users will share feelings, goals and struggles. The core promise is that none of it leaves
their device.

## Decision

- Profile, mood check-ins, chats and memory summaries live in IndexedDB via Dexie.
- No analytics, telemetry, crash reporting, remote config or ads. Ever.
- The only network traffic is the first-time download of the app and of model files from the
  hosts allowed in the Content-Security-Policy (`index.html`). Requests never carry user data.
- `fetch` is banned by lint outside `src/llm`; a Playwright test asserts that first load makes
  no cross-origin requests.
- The app calls `navigator.storage.persist()` so the browser does not evict data under pressure.
- Settings offer one-tap **export** (JSON download) and **delete everything** (IndexedDB, Cache
  Storage and OPFS).

## Options considered

- **Optional cloud sync:** useful across devices, but breaks the promise; out of scope.
- **localStorage:** too small and synchronous; IndexedDB is the right store.

## Consequences

Data is lost if the user clears site data or loses the device, so export matters. Any new
dependency must be checked for hidden network calls (see the privacy-safety-checker agent).
