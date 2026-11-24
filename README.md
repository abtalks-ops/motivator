# Motivator

A private, offline motivational coach that runs entirely in your browser.

Talk to Arjun or Maya about what is on your mind and get a short, encouraging reply with one
small next step. The language model runs on your device, so your conversations never leave it.
Motivator is a coach, not a therapist, and does not give medical advice.

## Status

Milestone 1 (in progress): PWA shell, onboarding profile, text chat with an on-device LLM.
Later milestones add speech input and voice output, the animated character and room, and
memory.

## How it works

| Part    | Choice                                                                        |
| ------- | ----------------------------------------------------------------------------- |
| App     | Vite, React, TypeScript, installable PWA with offline support                 |
| LLM     | WebLLM on WebGPU, wllama (WebAssembly) fallback; Qwen2.5 1.5B or Llama 3.2 3B |
| Storage | IndexedDB on your device; export or delete everything at any time             |
| Hosting | GitHub Pages; models download once from Hugging Face at pinned versions       |

Decisions and their reasons are in [docs/adr](docs/adr/README.md).

## Develop

Requires Node 22 (see `.nvmrc`).

```sh
npm ci
npm run dev          # http://localhost:5173/motivator/
npm run check        # type-check, lint, format check, unit tests
npm run e2e -- --trace off   # Playwright end-to-end tests
```

Working with Claude Code? Start with [CLAUDE.md](CLAUDE.md).

## Privacy

- No accounts, no analytics, no servers that receive your data.
- After the first model download, the app works fully offline.
- Your profile and chats are stored only in this browser's IndexedDB.
