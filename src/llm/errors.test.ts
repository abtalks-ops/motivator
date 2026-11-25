import {
  errorText,
  explainError,
  isRecoverableGpuError,
  LlmError,
  smallerModelMayHelp,
} from './errors';

describe('errorText', () => {
  it('reads plain strings, which is how the WebLLM worker rejects', () => {
    expect(errorText('Error: Device was lost')).toBe('Device was lost');
  });

  it('reads Error objects and error-like objects', () => {
    expect(errorText(new TypeError('Failed to fetch'))).toBe('Failed to fetch');
    expect(errorText({ message: 'GPUOutOfMemoryError: out of memory' })).toBe('out of memory');
    expect(errorText(undefined)).toBe('');
  });
});

describe('explainError', () => {
  it('names GPU memory problems and keeps the raw text as detail', () => {
    const e = explainError('Error: GPU device was lost');
    expect(e.message).toMatch(/ran out of memory/);
    expect(e.detail).toBe('GPU device was lost');
  });

  it('names missing f16 shader support', () => {
    expect(explainError('Error: This model requires feature shader-f16').message).toMatch(
      /does not support/,
    );
  });

  it('never hides an unknown failure behind an empty detail', () => {
    const e = explainError({});
    expect(e.message).toMatch(/could not reply/);
    expect(e.detail).toBe('[object Object]');
    expect(explainError(undefined).detail).toBe('No details were given.');
  });

  it('gives load-specific advice for network errors', () => {
    expect(explainError(new TypeError('Failed to fetch'), 'load').message).toMatch(/interrupted/);
  });
});

describe('LlmError.from', () => {
  it('wraps any thrown value once', () => {
    const e = LlmError.from('Error: Device was lost', 'reply');
    expect(e).toBeInstanceOf(Error);
    expect(e.detail).toBe('Device was lost');
    expect(LlmError.from(e, 'reply')).toBe(e);
  });
});

describe('error rules with real-looking runtime text', () => {
  it('treats a failed fetch of a q4f16 model file as a network problem, not a GPU feature', () => {
    const text =
      'TypeError: Failed to fetch https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/abc/params_shard_6.bin';
    expect(explainError(text, 'load').message).toMatch(/interrupted/);
  });

  it('treats a storage-buffer limit as GPU memory, not disk space', () => {
    const text = 'Error: Buffer binding size exceeds maxStorageBufferBindingSize (134217728)';
    expect(explainError(text).message).toMatch(/ran out of memory/);
  });

  it('treats a long prompt as a context problem', () => {
    const text = 'Error: Prompt tokens exceed context window size: 5000 > 4096';
    expect(explainError(text).message).toMatch(/too long/);
    expect(isRecoverableGpuError(text)).toBe(false);
  });

  it('only reloads the model for GPU errors', () => {
    expect(isRecoverableGpuError('Error: Device was lost')).toBe(true);
    expect(isRecoverableGpuError('Error: Prompt tokens exceed context window size')).toBe(false);
  });
});

describe('smallerModelMayHelp', () => {
  it.each(['Device was lost', 'GPUOutOfMemoryError', 'Failed to allocate buffer'])(
    'offers a smaller model for %s',
    (detail) => expect(smallerModelMayHelp(detail)).toBe(true),
  );

  it.each(['Prompt exceeds context window size', 'Failed to fetch', null])(
    'does not for %s',
    (detail) => expect(smallerModelMayHelp(detail)).toBe(false),
  );
});
