# Architecture decision records

Each significant decision gets a short record. Use the `/new-adr` skill or copy `template.md`.

| #                               | Decision                                                  | Status   |
| ------------------------------- | --------------------------------------------------------- | -------- |
| [0001](0001-pwa-stack.md)       | App stack: Vite, React and TypeScript as a PWA            | Accepted |
| [0002](0002-local-only-data.md) | All user data stays on the device                         | Accepted |
| [0003](0003-llm-runtime.md)     | On-device LLM: WebLLM with wllama fallback, tiered models | Accepted |
| [0004](0004-model-hosting.md)   | Models download from Hugging Face at pinned revisions     | Accepted |
| [0005](0005-persona-prompts.md) | Two coach personas defined by versioned system prompts    | Accepted |
