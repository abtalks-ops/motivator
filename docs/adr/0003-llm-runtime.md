# 0003. On-device LLM: WebLLM with wllama fallback, tiered models

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

The coach needs a warm, coherent chat model that runs in the browser on phones and laptops,
offline. Devices differ widely in GPU support and memory.

## Decision

- **Primary runtime:** WebLLM (`@mlc-ai/web-llm`) on WebGPU, in a dedicated Web Worker.
- **Fallback runtime:** wllama (llama.cpp compiled to WebAssembly) with GGUF weights, for
  browsers without WebGPU.
- **Tiers:**
  - _Default:_ Qwen2.5 1.5B Instruct, 4-bit (about 1 GB). Runs on most phones, handles
    Hindi reasonably.
  - _Quality:_ Llama 3.2 3B Instruct, 4-bit (about 2 GB). More empathetic, less repetitive.
- On first launch the app reads WebGPU support, adapter limits and `navigator.deviceMemory`,
  recommends a tier, and lets the user override it later in settings.
- Replies stream token by token; the UI renders them as they arrive, and later milestones send
  each finished sentence to text-to-speech.
- No fine-tuning in v1. The persona comes from system prompts (ADR 0005). A LoRA trained offline
  on coaching dialogues is the next step if the tone is not right.

## Options considered

- **Transformers.js for the LLM:** good for small models, but slower than WebLLM for 1B+ chat.
- **Gemma 3 4B as quality tier:** strong, but larger; kept as a future option.
- **Phi-3.5 mini:** good reasoning, weaker conversational warmth and multilingual support.

## Consequences

Model download is the heaviest step of onboarding and needs progress, resume and retry. The
`llm` module exposes one interface so runtimes and models can be swapped without touching the UI.
