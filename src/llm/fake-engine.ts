import type { ChatMessage, GenerateOptions, LlmEngine, LoadProgress, ModelTier } from './types';

/**
 * Stand-in engine for end-to-end tests (VITE_FAKE_LLM=1). It never touches the network,
 * so CI can exercise the whole flow without downloading a model.
 */
export class FakeEngine implements LlmEngine {
  readonly runtime = 'webllm' as const;

  async load(_tier: ModelTier, onProgress?: (p: LoadProgress) => void): Promise<void> {
    for (const fraction of [0.25, 0.5, 1]) {
      await new Promise((r) => setTimeout(r, 20));
      onProgress?.({ fraction, text: `Loading test model ${Math.round(fraction * 100)}%` });
    }
  }

  async generate(messages: ChatMessage[], options: GenerateOptions = {}): Promise<string> {
    const last = messages.at(-1)?.content ?? '';
    const reply = `[nod] I hear you about "${last.slice(0, 40)}". That is a real feeling. Let's pick one small step you can take in the next ten minutes.`;
    let full = '';
    for (const word of reply.split(/(?<= )/)) {
      if (options.signal?.aborted) break;
      await new Promise((r) => setTimeout(r, 5));
      full += word;
      options.onToken?.(word, full);
    }
    return full;
  }

  async unload(): Promise<void> {}
}
