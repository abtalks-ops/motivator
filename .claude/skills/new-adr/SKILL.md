---
name: new-adr
description: Write a new architecture decision record in docs/adr when a technical decision is made or changed (stack, model, storage, hosting, persona, safety).
---

# New ADR

1. List `docs/adr/` and take the next free four-digit number.
2. Copy `docs/adr/template.md` to `docs/adr/NNNN-short-kebab-title.md`.
3. Fill in every section. Keep it under one page. Name the options you rejected and why.
4. Set **Status** to `Proposed` unless the person already approved the decision, then `Accepted`.
5. If it replaces an earlier ADR, set the old one's status to `Superseded by NNNN` and link both ways.
6. Add a line for it to the index table in `docs/adr/README.md`.
7. If the decision changes a rule or command in `CLAUDE.md`, update `CLAUDE.md` in the same change.
