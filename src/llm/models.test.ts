import { ggufUrl, MODELS, webllmModelUrl } from './models';

describe('model registry', () => {
  it.each(Object.values(MODELS))('$tier is pinned to commit hashes', (entry) => {
    expect(entry.webllm.revision).toMatch(/^[0-9a-f]{40}$/);
    expect(entry.gguf.revision).toMatch(/^[0-9a-f]{40}$/);
    expect(webllmModelUrl(entry)).toContain(`/resolve/${entry.webllm.revision}/`);
    expect(ggufUrl(entry)).toMatch(/\/resolve\/[0-9a-f]{40}\/.+\.gguf$/);
  });
});
