import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Runs WebLLM off the main thread. The engine in webllm-engine.ts talks to this handler.
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => handler.onmessage(msg);
