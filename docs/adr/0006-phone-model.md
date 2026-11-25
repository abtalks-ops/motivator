# 0006. Phones get a tiny model: SmolLM2 360M

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

On a phone, the default Qwen2.5 1.5B model (about 1.6 GB of GPU memory) downloaded but then
failed to reply or crashed the tab. Phones share memory between the GPU and everything else and
close a tab that asks for too much, and `navigator.deviceMemory` is missing on iOS and capped at
8 GB on Android, so memory checks alone cannot tell which phones are safe.

## Decision

- Add a third tier, **Phone: SmolLM2 360M Instruct**. WebLLM `q4f16_1` needs about 376 MB of
  GPU memory and downloads about 210 MB; the CPU fallback uses the official 8-bit GGUF (386 MB).
- Any phone or tablet (Client Hints `mobile`, a mobile user agent, or an iPad posing as a Mac)
  is recommended the phone tier, with or without WebGPU. So is any device reporting under 4 GB.
  The user can still pick a bigger model.
- Small models get a **compact persona prompt** (about 40% of the full one), the last 6
  messages instead of 12, a 2K context, and replies capped at 160 tokens. The boundaries stay.
- When a reply or load fails on a larger model, the chat offers "Use the smaller phone model".
- A GPU without 16-bit float shaders (`shader-f16`) counts as no WebGPU, because every WebLLM
  model we ship is q4f16 and would fail to load there; those devices use the CPU runtime.

## Options considered

| Model (4-bit unless noted) | GPU memory | Download (approx.) | WebLLM | wllama | Coaching replies              |
| -------------------------- | ---------- | ------------------ | ------ | ------ | ----------------------------- |
| SmolLM2 135M (16-bit only) | 360 MB     | 270 MB             | yes    | yes    | Often off-topic or repetitive |
| **SmolLM2 360M**           | 376 MB     | 210 MB             | yes    | yes    | Short, simple, mostly on-task |
| Gemma 3 270M               | n/a        | 250 MB             | no     | yes    | Weak at chat; meant to tune   |
| Qwen2.5 0.5B               | 945 MB     | 280 MB             | yes    | yes    | Better, Hindi works           |
| Qwen3 0.6B                 | 1403 MB    | 350 MB             | yes    | yes    | Good, but thinks aloud        |
| Gemma 3 1B (512 context)   | 711 MB     | 700 MB             | yes    | yes    | Warm, context too short       |
| Llama 3.2 1B               | 879 MB     | 700 MB             | yes    | yes    | Warm and coherent             |
| SmolLM2 1.7B               | 1774 MB    | 1 GB               | yes    | yes    | Larger than Qwen 1.5B         |

SmolLM2 1.7B was ruled out because it needs more GPU memory than the model that crashed.
Qwen2.5 0.5B and Llama 3.2 1B are the next step up if 360M replies prove too plain.

## Consequences

Phone replies are shorter and plainer, and Hindi is weak on SmolLM2. Existing phone users keep
their saved model until they change it in settings or tap the new button after a failure.
