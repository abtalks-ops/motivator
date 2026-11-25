import { ggufUrl, MODELS, webllmModelUrl } from './models';

describe('model registry', () => {
  it.each(Object.values(MODELS))('$tier is pinned to commit hashes', (entry) => {
    expect(entry.webllm.revision).toMatch(/^[0-9a-f]{40}$/);
    expect(entry.gguf.revision).toMatch(/^[0-9a-f]{40}$/);
    expect(webllmModelUrl(entry)).toContain(`/resolve/${entry.webllm.revision}/`);
    expect(ggufUrl(entry)).toMatch(/\/resolve\/[0-9a-f]{40}\/.+\.gguf$/);
  });

  it('keeps the phone model small', () => {
    expect(MODELS.phone.webllm.vramMB).toBeLessThan(600);
    expect(MODELS.phone.small).toBe(true);
    expect(MODELS.phone.contextWindow).toBeLessThanOrEqual(2048);
  });
});
