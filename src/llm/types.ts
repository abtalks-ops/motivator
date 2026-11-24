export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  content: string;
}

export type ModelTier = 'default' | 'quality';
export type RuntimeKind = 'webllm' | 'wllama';

export interface LoadProgress {
  /** 0..1, or null when the runtime cannot tell yet. */
  fraction: number | null;
  text: string;
}

export interface GenerateOptions {
  onToken?: (delta: string, full: string) => void;
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
}

/** One interface for every runtime, so the UI never knows which one is running. */
export interface LlmEngine {
  readonly runtime: RuntimeKind;
  load(tier: ModelTier, onProgress?: (p: LoadProgress) => void): Promise<void>;
  generate(messages: ChatMessage[], options?: GenerateOptions): Promise<string>;
  unload(): Promise<void>;
}
