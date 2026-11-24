---
name: release
description: Prepare a release of the Motivator PWA to GitHub Pages: verify checks, bump the version, write release notes and confirm offline behaviour.
---

# Release

1. Make sure you are on an up-to-date `main` with a clean tree.
2. Run `npm run check` and `npm run e2e -- --trace off`. Stop if anything fails.
3. Confirm every model in `src/llm/models.ts` is pinned to a commit revision, not `main`.
4. Bump `version` in `package.json` (semver: patch for fixes, minor for features).
5. Write release notes from the merged PR titles since the last tag, grouped as
   Features, Fixes and Internal. Call out any change to prompts (`PROMPT_VERSION`) or models.
6. Open a PR titled `Release vX.Y.Z`. Do not tag or push to `main` yourself; the person merges,
   and the Pages workflow deploys `main`.
7. After deploy, the person should open the site, go offline, and reload to confirm it still works.
