import { collectStream } from './stream';

async function* chunks(parts: (string | null)[]) {
  for (const content of parts) yield { choices: [{ delta: { content } }] };
}

describe('collectStream', () => {
  it('joins deltas and reports each one', async () => {
    const seen: string[] = [];
    const text = await collectStream(chunks(['Hi', null, ' there']), {
      onToken: (_d, full) => seen.push(full),
    });
    expect(text).toBe('Hi there');
    expect(seen).toEqual(['Hi', 'Hi there']);
  });

  it('stops when aborted', async () => {
    const controller = new AbortController();
    const text = await collectStream(chunks(['a', 'b', 'c']), {
      signal: controller.signal,
      onToken: (_d, full) => {
        if (full === 'ab') controller.abort();
      },
    });
    expect(text).toBe('ab');
  });
});
