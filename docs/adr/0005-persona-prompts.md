# 0005. Two coach personas defined by versioned system prompts

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

The user picks a male or female coach. Each should feel distinct, personal and safe, without any
training on the device.

## Decision

- Two characters, each with its own system prompt shipped with the app:
  - **Arjun:** direct, tough-love coach. Warm, but pushes for action and accountability.
  - **Maya:** gentle, patient coach. Validates first, then nudges softly.
- Shared reply style: acknowledge the feeling, reframe it, offer one small concrete step.
  Two to four sentences, plain text, because replies will be spoken.
- Shared boundaries: clearly a coach, not a therapist; no medical, diagnostic or medication
  advice; avoid generic quotes and toxic positivity.
- Personalisation by prompt context only: onboarding profile, today's mood check-in, user
  preferences, and (milestone 4) short summaries of past chats.
- The model may add gesture tags such as `[nod]` or `[open-hands]`; the app strips them from the
  text and later uses them to drive animation.
- An on-device crisis-language check runs on every user message before the model and shows a
  helpline card.
- Prompts carry a `PROMPT_VERSION` and are tested against tricky conversations (`/test-persona`).

## Options considered

- **Fine-tune per persona:** heavier, and prompts get most of the way; deferred.
- **One shared personality:** simpler, but the user asked for two distinct styles.

## Consequences

Swapping a coach is instant (swap the prompt). Small models follow long prompts less reliably,
so prompts stay short and the post-processing (tag stripping, length trimming) is defensive.
