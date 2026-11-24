import type { GenerateOptions } from './types';

interface ChunkLike {
  choices: { delta?: { content?: string | null } }[];
}

/** Collects an OpenAI-style chunk stream into text, reporting each delta. */
export async function collectStream(
  chunks: AsyncIterable<ChunkLike>,
  options: Pick<GenerateOptions, 'onToken' | 'signal'> = {},
): Promise<string> {
  let full = '';
  for await (const chunk of chunks) {
    if (options.signal?.aborted) break;
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (!delta) continue;
    full += delta;
    options.onToken?.(delta, full);
  }
  return full;
}
