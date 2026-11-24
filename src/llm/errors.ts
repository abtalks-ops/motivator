/**
 * Errors from the model runtimes come in many shapes. WebLLM's worker rejects with a plain
 * string (the error's toString()), not an Error, so `err instanceof Error` checks miss them.
 * Everything here turns "some thrown value" into a friendly reason plus a technical detail.
 */

export interface ExplainedError {
  /** Plain-language reason, safe to show as the main error line. */
  message: string;
  /** The runtime's own error text, shown as a smaller "technical detail" line. */
  detail: string;
}

/** The raw text of any thrown value, without a leading "Error: " prefix. */
export function errorText(err: unknown): string {
  let text: string;
  if (err instanceof Error) text = err.message || err.name;
  else if (typeof err === 'string') text = err;
  else if (err && typeof err === 'object' && 'message' in err) text = String(err.message);
  else text = String(err ?? '');
  return text.replace(/^(Uncaught )?\w*Error:\s*/, '').trim();
}

/** Which part of the app failed; it changes the advice, not the detection. */
export type ErrorPhase = 'load' | 'reply';

const RULES: { test: RegExp; message: (phase: ErrorPhase) => string }[] = [
  {
    test: /quota|not enough storage|storage (is )?full|insufficient storage/i,
    message: () =>
      'Not enough storage space for the model. Free some space or pick the light model.',
  },
  {
    test: /shader-f16|feature.*not supported|FeatureNotSupported/i,
    message: () =>
      "This phone's graphics chip does not support the features the model needs. Switch to CPU mode below.",
  },
  {
    test: /context window|context length|prompt.*(too long|exceed)/i,
    message: () => 'The conversation got too long for the model. Retry to send a shorter history.',
  },
  {
    test: /device (was )?lost|devicelost|out of memory|OOM|allocat|maxBufferSize|maxStorageBuffer|buffer size/i,
    message: () =>
      'The graphics chip ran out of memory. Close other tabs and apps, then retry, or switch to CPU mode below.',
  },
  {
    test: /webgpu|gpu|adapter/i,
    message: () => 'The graphics chip could not run the model. Retry, or switch to CPU mode below.',
  },
  {
    test: /fetch|network|Failed to|load failed|NetworkError/i,
    message: (phase) =>
      phase === 'load'
        ? 'The download was interrupted. Check your connection and try again; finished parts are kept.'
        : 'Part of the model could not be read. Check your connection and retry.',
  },
  {
    test: /not (ready|loaded)|reload|initialized/i,
    message: () => 'Your coach is not awake yet. Wait a moment, then retry.',
  },
];

/** Errors that mean the GPU state is gone or full, which a reload from cache can fix. */
const GPU_RECOVERABLE =
  /device (was )?lost|devicelost|out of memory|OOM|GPUOutOfMemory|GPUValidation|webgpu|\bgpu\b/i;

export function isRecoverableGpuError(err: unknown): boolean {
  return GPU_RECOVERABLE.test(errorText(err));
}

export function explainError(err: unknown, phase: ErrorPhase = 'reply'): ExplainedError {
  const detail = errorText(err) || 'No details were given.';
  const rule = RULES.find((r) => r.test.test(detail));
  const fallback =
    phase === 'load'
      ? 'Something went wrong while loading the model.'
      : 'Your coach could not reply. Retry, or switch to CPU mode below.';
  return { message: rule ? rule.message(phase) : fallback, detail };
}

/** An Error that carries the explained reason and the runtime's detail. */
export class LlmError extends Error {
  constructor(
    message: string,
    readonly detail: string,
  ) {
    super(message);
    this.name = 'LlmError';
  }

  static from(err: unknown, phase: ErrorPhase): LlmError {
    if (err instanceof LlmError) return err;
    const { message, detail } = explainError(err, phase);
    return new LlmError(message, detail);
  }
}

/**
 * Logs a runtime error to this device's own console so it can be read with remote debugging.
 * Only the error goes in, never the user's messages. Nothing is sent anywhere.
 */
export function logLlmError(context: string, err: unknown): void {
  console.error(`[motivator] ${context}:`, err);
}
