import { Wllama } from '@wllama/wllama';
import wasmUrl from '@wllama/wllama/esm/wasm/wllama.wasm?url';
import { ggufUrl, MODELS } from './models';
import { collectStream } from './stream';
import type { ChatMessage, GenerateOptions, LlmEngine, LoadProgress, ModelTier } from './types';

/** CPU (WebAssembly) fallback for browsers without WebGPU. wllama runs its own worker. */
export class WllamaEngine implements LlmEngine {
  readonly runtime = 'wllama' as const;
  private wllama: Wllama | null = null;

  async load(tier: ModelTier, onProgress?: (p: LoadProgress) => void): Promise<void> {
    await this.unload();
    const wllama = new Wllama({ default: wasmUrl }, { suppressNativeLog: true });
    const entry = MODELS[tier];
    try {
      await wllama.loadModelFromUrl(ggufUrl(entry), {
        n_ctx: entry.contextWindow,
        progressCallback: ({ loaded, total }) => {
          const fraction = total > 0 ? loaded / total : null;
          onProgress?.({
            fraction,
            text: `Downloading ${entry.label}: ${Math.round(loaded / 1e6)} of ${Math.round(total / 1e6)} MB`,
          });
        },
      });
    } catch (err) {
      await wllama.exit().catch(() => undefined);
      throw err;
    }
    this.wllama = wllama;
  }

  async generate(messages: ChatMessage[], options: GenerateOptions = {}): Promise<string> {
    if (!this.wllama) throw new Error('Model is not loaded');
    const stream = await this.wllama.createChatCompletion({
      messages,
      stream: true,
      max_tokens: options.maxTokens ?? 256,
      temperature: options.temperature ?? 0.7,
      ...(options.signal ? { abortSignal: options.signal } : {}),
    });
    try {
      return await collectStream(stream, options);
    } catch (err) {
      // wllama throws on abort; treat a stop like WebLLM does and keep the partial reply.
      if (options.signal?.aborted) return '';
      throw err;
    }
  }

  async unload(): Promise<void> {
    await this.wllama?.exit();
    this.wllama = null;
  }
}
