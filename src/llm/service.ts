import type {
  ChatMessage,
  GenerateOptions,
  LlmEngine,
  LoadProgress,
  ModelTier,
  RuntimeKind,
} from './types';
import { explainError, isRecoverableGpuError, LlmError, logLlmError } from './errors';

export type LlmStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LlmState {
  status: LlmStatus;
  tier: ModelTier | null;
  runtime: RuntimeKind | null;
  progress: LoadProgress | null;
  error: string | null;
  /** The runtime's own error text for `error`, shown as a technical detail line. */
  errorDetail: string | null;
}

export type EngineFactory = (runtime: RuntimeKind) => Promise<LlmEngine>;

/** Runtimes load lazily so their large bundles stay out of the first page load. */
export const defaultEngineFactory: EngineFactory = async (runtime) => {
  if (import.meta.env.VITE_FAKE_LLM === '1') {
    const { FakeEngine } = await import('./fake-engine');
    return new FakeEngine(runtime);
  }
  if (runtime === 'webllm') {
    const { WebLlmEngine } = await import('./webllm-engine');
    return new WebLlmEngine();
  }
  const { WllamaEngine } = await import('./wllama-engine');
  return new WllamaEngine();
};

const INITIAL: LlmState = {
  status: 'idle',
  tier: null,
  runtime: null,
  progress: null,
  error: null,
  errorDetail: null,
};

/** Holds the one loaded model for the app and lets React subscribe to its state. */
export class LlmService {
  private state: LlmState = INITIAL;
  private engine: LlmEngine | null = null;
  private listeners = new Set<() => void>();
  private loadId = 0;
  private loading: Promise<void> = Promise.resolve();
  private generating = false;

  constructor(private readonly factory: EngineFactory = defaultEngineFactory) {}

  getState = (): LlmState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Loads a model. Loads run one at a time, so two models are never in memory together. */
  load(tier: ModelTier, runtime: RuntimeKind, force = false): Promise<void> {
    const next = this.loading.then(() => this.loadNow(tier, runtime, force));
    this.loading = next.catch(() => undefined);
    return next;
  }

  private async loadNow(tier: ModelTier, runtime: RuntimeKind, force: boolean): Promise<void> {
    const same = this.state.tier === tier && this.state.runtime === runtime;
    if (!force && this.state.status === 'ready' && same) return;
    const id = ++this.loadId;
    this.set({ status: 'loading', tier, runtime, progress: null, error: null, errorDetail: null });
    try {
      await this.engine?.unload();
      this.engine = null;
      const engine = await this.factory(runtime);
      try {
        await engine.load(tier, (progress) => {
          if (id === this.loadId) this.set({ ...this.state, progress });
        });
      } catch (err) {
        await engine.unload().catch(() => undefined);
        throw err;
      }
      if (id !== this.loadId) {
        await engine.unload();
        return;
      }
      this.engine = engine;
      this.set({ ...this.state, status: 'ready', progress: { fraction: 1, text: 'Ready' } });
    } catch (err) {
      if (id !== this.loadId) return;
      logLlmError(`loading ${tier} model with ${runtime} failed`, err);
      const { message, detail } = explainError(err, 'load');
      this.set({ ...this.state, status: 'error', error: message, errorDetail: detail });
    }
  }

  /**
   * One reply at a time: a second call while one is running is refused.
   * Failures are rethrown as LlmError, with a plain reason and the runtime's detail. A WebGPU
   * reply that fails is retried once after reloading the model from the local cache, because
   * phones often lose the GPU device (for example when the tab was in the background).
   */
  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string> {
    if (this.generating) throw new LlmError('Your coach is still replying.', 'busy');
    if (!this.engine || this.state.status !== 'ready') {
      if (this.state.error) throw new LlmError(this.state.error, this.state.errorDetail ?? '');
      throw LlmError.from('Model is not ready', 'reply');
    }
    this.generating = true;
    try {
      return await this.engine.generate(messages, options);
    } catch (err) {
      if (options?.signal?.aborted) throw err;
      logLlmError(`reply with ${this.state.runtime} failed`, err);
      const { tier, runtime } = this.state;
      if (runtime !== 'webllm' || !tier || !isRecoverableGpuError(err)) {
        throw LlmError.from(err, 'reply');
      }
      await this.load(tier, runtime, true);
      const engine = this.engine as LlmEngine | null;
      if (!engine || this.state.status !== 'ready' || options?.signal?.aborted) {
        throw LlmError.from(err, 'reply');
      }
      try {
        return await engine.generate(messages, options);
      } catch (retryErr) {
        if (options?.signal?.aborted) throw retryErr;
        logLlmError('reply failed again after reloading the model', retryErr);
        throw LlmError.from(retryErr, 'reply');
      }
    } finally {
      this.generating = false;
    }
  }

  /** Moves to the CPU (WebAssembly) runtime, which works without WebGPU but downloads its own copy. */
  switchToCpu(): Promise<void> {
    return this.load(this.state.tier ?? 'default', 'wllama');
  }

  async unload(): Promise<void> {
    this.loadId++;
    await this.engine?.unload();
    this.engine = null;
    this.set(INITIAL);
  }

  private set(next: LlmState) {
    this.state = next;
    for (const l of this.listeners) l();
  }
}

/** Plain-language reason for a failed model load. */
export function describeError(err: unknown): string {
  return explainError(err, 'load').message;
}

export const llm = new LlmService();
