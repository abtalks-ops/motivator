# Motivator: project guide for Claude Code

An offline, private motivational coach that runs entirely in the browser as a PWA. The user
talks (text now, speech later) to a seated 2D coach, Arjun or Maya, who replies in a warm,
motivating way using an on-device LLM. Read `docs/adr/` for the reasons behind each choice.

## Non-negotiable rules

1. **Nothing the user says leaves the device.** No analytics, telemetry, crash reporting or
   remote config. The only network use is downloading the app and model files from the hosts in
   the CSP in `index.html`. `fetch` is allowed only in `src/llm` for model downloads (lint enforces
   this). Never put user data in a URL, header or request body.
2. **User data lives in IndexedDB (Dexie)** on this origin. Every new table must be covered by
   export and "delete everything".
3. **Coach, not therapist.** No medical, diagnostic or medication advice. The crisis check runs
   on every user message before the model. Keep the "coach, not a therapist" label visible.
4. **Heavy work runs in Web Workers.** Never run model inference on the main thread.
5. **Pin model revisions** to a commit hash in `src/llm/models.ts`. Never use `main`.
6. **Prompts are code.** Changing a persona prompt means bumping `PROMPT_VERSION` and running
   `/test-persona`.

## Commands

| Task                      | Command                      |
| ------------------------- | ---------------------------- |
| Install                   | `npm ci`                     |
| Dev server                | `npm run dev`                |
| Type-check                | `npm run typecheck`          |
| Lint                      | `npm run lint`               |
| Format                    | `npm run format`             |
| Unit tests                | `npm test`                   |
| All checks (what CI runs) | `npm run check`              |
| End-to-end (builds first) | `npm run e2e -- --trace off` |
| Production build          | `npm run build`              |

The app is served under `/motivator/` (GitHub Pages). Set `BASE_PATH=/` for other hosts.

## Layout

```
src/
  app/          App root and screen routing
  ui/           Shared components and global styles
  pwa/          Service worker registration, update prompt, persistent storage
  storage/      Dexie database, export and delete-everything        (milestone 1, PR 2)
  onboarding/   Profile form and mood check-in                       (milestone 1, PR 2)
  llm/          Model registry, device tier detection, worker runtimes (PR 3)
  persona/      Arjun and Maya prompts, prompt assembly, gesture tags (PR 4)
  safety/       Crisis-language detection and helpline card          (PR 4)
  chat/         Chat screen and conversation state                   (PR 4)
  settings/     Profile summary, export and delete everything
  speech/ voice/ character/   Later milestones
e2e/            Playwright tests
docs/adr/       Architecture decision records
.claude/        Shared Claude Code settings, hooks, skills and agents
```

Each module exposes its public API from `index.ts`; other modules import only from there.

## Coding rules

- Strict TypeScript: no `any`, no `@ts-ignore`, no unexplained non-null `!`.
- React function components and hooks. Keep components small; logic goes in plain TS modules
  that are easy to unit-test.
- Accessibility: every input has a label, every control works by keyboard, respect
  `prefers-reduced-motion`, and anything spoken also appears as text.
- Tests: Vitest for logic next to the file (`foo.test.ts`); Playwright for user flows.
- Formatting is automatic (Prettier hook after each edit). Do not fight it.

## Workflow

- Plan first: each milestone starts with a short plan or ADR the person approves.
- Small PRs: one feature per PR, with tests and a clear description. Branch from `main`.
- Before opening a PR, run the `code-reviewer` and `privacy-safety-checker` agents and fix what
  they find.
- When a decision changes, write or update an ADR (`/new-adr`) and update this file.

## Claude Code setup in this repo

- `.claude/settings.json`: allows safe commands (npm scripts, tests, read-only git), asks
  before installs and pushes, and denies force pushes, `curl`/`wget` and reading secrets.
- Hooks: Prettier + ESLint fix after every edit; type-check, lint and unit tests before a task
  is reported done.
- Skills: `/new-adr`, `/test-persona`, `/release`.
- Agents: `code-reviewer`, `privacy-safety-checker`.
