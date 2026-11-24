# 0001. App stack: Vite, React and TypeScript as a PWA

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

The motivator must install from the web, work fully offline after setup, and run on phones and
laptops without an app store. The UI is modest (onboarding, chat, later an animated character),
but the app hosts heavy work: an LLM, speech recognition and speech synthesis.

## Decision

- Vite + React 19 + strict TypeScript.
- `vite-plugin-pwa` (Workbox `generateSW`) for the manifest and service worker. The service
  worker precaches the app shell only; model weights are cached separately by the runtimes.
- Heavy work runs in Web Workers behind small typed interfaces, one module per concern:
  `ui`, `onboarding`, `chat`, `llm`, `persona`, `safety`, `storage`, and later `speech`, `voice`
  and `character`.
- Quality gates: ESLint (typescript-eslint strict), Prettier, Vitest + Testing Library,
  Playwright for end-to-end, and GitHub Actions on every pull request.
- Hosting: GitHub Pages under `/motivator/`.

## Options considered

- **Native app (React Native, Flutter):** better GPU access, but needs app stores; rejected for v1.
- **Next.js:** server features we do not want; a static SPA is simpler for an offline PWA.
- **Svelte or Solid:** lighter, but React has the best ecosystem for Rive and test tooling.

## Consequences

The whole product is a static site, so there is no server that could ever receive user data.
WebGPU availability varies by browser, which ADR 0003 handles with a fallback runtime.
