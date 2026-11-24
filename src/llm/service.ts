import type {
  ChatMessage,
  GenerateOptions,
  LlmEngine,
  LoadProgress,
  ModelTier,
  RuntimeKind,
} from './types';

export type LlmStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LlmState {
  status: LlmStatus;
  tier: ModelTier | null;
  runtime: RuntimeKind | null;
  progress: LoadProgress | null;
  error: string | null;
}

export type EngineFactory = (runtime: RuntimeKind) => Promise<LlmEngine>;

/** Runtimes load lazily so their large bundles stay out of the first page load. */
export const defaultEngineFactory: EngineFactory = async (runtime) => {
  if (import.meta.env.VITE_FAKE_LLM === '1') {
    const { FakeEngine } = await import('./fake-engine');
    return new FakeEngine();
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
  load(tier: ModelTier, runtime: RuntimeKind): Promise<void> {
    const next = this.loading.then(() => this.loadNow(tier, runtime));
    this.loading = next.catch(() => undefined);
    return next;
  }

  private async loadNow(tier: ModelTier, runtime: RuntimeKind): Promise<void> {
    if (this.state.status === 'ready' && this.state.tier === tier && this.state.runtime === runtime)
      return;
    const id = ++this.loadId;
    this.set({ status: 'loading', tier, runtime, progress: null, error: null });
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
      this.set({ ...this.state, status: 'error', error: describeError(err) });
    }
  }

  /** One reply at a time: a second call while one is running is refused. */
  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string> {
    if (!this.engine || this.state.status !== 'ready') throw new Error('Model is not ready');
    if (this.generating) throw new Error('Your coach is still replying');
    this.generating = true;
    try {
      return await this.engine.generate(messages, options);
    } finally {
      this.generating = false;
    }
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

export function describeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/quota|storage/i.test(message)) {
    return 'Not enough storage space for the model. Free some space or pick the light model.';
  }
  if (/fetch|network|Failed to|load failed|NetworkError/i.test(message)) {
    return 'The download was interrupted. Check your connection and try again; finished parts are kept.';
  }
  if (/webgpu|gpu|device lost/i.test(message)) {
    return 'The graphics chip could not run this model. Try the light model.';
  }
  return message || 'Something went wrong while loading the model.';
}

export const llm = new LlmService();
