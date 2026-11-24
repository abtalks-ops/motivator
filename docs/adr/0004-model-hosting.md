# 0004. Models download from Hugging Face at pinned revisions

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

GitHub Pages caps a site at about 1 GB and 100 MB per file, so it cannot host 1 to 3B models.
Mimic self-hosts its smaller speech models, but we want to stay on free hosting.

## Decision

- LLM weights download straight from Hugging Face, which allows browser (CORS) downloads.
- Every model is pinned to a commit hash, never `main`, so an upstream change cannot break or
  silently alter the app. The model registry lives in `src/llm/models.ts`.
- WebLLM caches weights in Cache Storage; wllama caches in OPFS / Cache Storage. After the first
  download the app works offline.
- The download screen shows progress, explains the size up front, and offers retry when
  Hugging Face is slow or down.
- Speech models (later milestones) are small enough to self-host on Pages, as in Mimic.
- The allowed download hosts are listed in the CSP `connect-src` in `index.html`.

## Options considered

- **Self-host on a bucket or CDN:** full control, but costs money; revisit if Hugging Face
  becomes unreliable. Only the model base URL would change.
- **Bundle models in the app:** impossible within Pages limits and would bloat updates.

## Consequences

First-time setup depends on Hugging Face being reachable. The registry must be updated
deliberately (via PR) to move to a new model revision.
