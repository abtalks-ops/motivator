import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import type * as LlmModule from '../llm';
import type { ChatMessage, GenerateOptions, ModelTier } from '../llm';
import { db, repo, type Profile } from '../storage';
import { useChat } from './useChat';

const generate = vi.fn<(messages: ChatMessage[], options?: GenerateOptions) => Promise<string>>();
let tier: ModelTier | null = 'default';

vi.mock('../llm', async (importOriginal) => {
  const actual = await importOriginal<typeof LlmModule>();
  return {
    ...actual,
    llm: {
      generate: (m: ChatMessage[], o?: GenerateOptions) => generate(m, o),
      getState: () => ({ tier }),
    },
  };
});

const profile: Profile = {
  id: 'me',
  name: 'Asha',
  focus: 'career',
  goal: 'Ship my portfolio',
  style: 'balanced',
  coach: 'arjun',
  createdAt: 0,
  updatedAt: 0,
};

beforeEach(async () => {
  generate.mockReset();
  tier = 'default';
  await repo.clearMessages();
});

describe('useChat model size', () => {
  async function promptFor(t: ModelTier) {
    tier = t;
    generate.mockResolvedValueOnce('One step today.');
    const { result } = renderHook(() => useChat(profile, undefined));
    await act(() => result.current.send('I keep putting it off'));
    const [messages, options] = generate.mock.calls.at(-1) ?? [];
    return { system: messages?.[0]?.content ?? '', maxTokens: options?.maxTokens };
  }

  it('sends the compact prompt and shorter replies to the phone model', async () => {
    const phone = await promptFor('phone');
    const light = await promptFor('default');
    expect(phone.system.length).toBeLessThan(light.system.length / 2);
    expect(phone.maxTokens).toBeLessThan(light.maxTokens ?? 0);
  });

  it('sends the phone model less history, within its context', async () => {
    for (let i = 0; i < 20; i++) {
      await repo.addMessage({
        role: i % 2 ? 'assistant' : 'user',
        content: 'मुझे पढ़ाई में मन नहीं लगता '.repeat(8),
        coach: 'arjun',
        createdAt: i,
      });
    }
    tier = 'phone';
    generate.mockResolvedValueOnce('One step today.');
    const { result } = renderHook(() => useChat(profile, undefined));
    await act(() => result.current.send('Help'));
    const sent = generate.mock.calls.at(-1)?.[0] ?? [];
    expect(sent.length - 1).toBeLessThanOrEqual(6);
    expect(sent.at(-1)).toEqual({ role: 'user', content: 'Help' });
  });
});

describe('useChat errors and retry', () => {
  it('shows the real reason when the runtime rejects with a plain string', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    generate.mockRejectedValueOnce('Error: Device was lost');
    const { result } = renderHook(() => useChat(profile, undefined));
    await act(() => result.current.send('Stress'));
    expect(result.current.error).toEqual({
      message: expect.stringMatching(/ran out of memory/),
      detail: 'Device was lost',
    });
    vi.restoreAllMocks();
  });

  it('retries the last unanswered message without storing it twice', async () => {
    generate.mockRejectedValueOnce('Error: Device was lost').mockResolvedValueOnce('You got this.');
    const { result } = renderHook(() => useChat(profile, undefined));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(() => result.current.send('Stress'));
    await act(() => result.current.retry());
    expect(result.current.error).toBeNull();
    const stored = await repo.recentMessages(10);
    expect(stored.map((m) => [m.role, m.content])).toEqual([
      ['user', 'Stress'],
      ['assistant', 'You got this.'],
    ]);
    expect(generate.mock.calls[1]?.[0].at(-1)).toEqual({ role: 'user', content: 'Stress' });
    vi.restoreAllMocks();
  });

  it('never sends a crisis message to the model on retry', async () => {
    await db.messages.add({
      role: 'user',
      content: "I don't want to be alive anymore",
      coach: 'arjun',
      createdAt: Date.now(),
    });
    const { result } = renderHook(() => useChat(profile, undefined));
    await act(() => result.current.retry());
    expect(generate).not.toHaveBeenCalled();
  });

  it('does nothing when the last message already has an answer', async () => {
    generate.mockResolvedValue('Nice.');
    const { result } = renderHook(() => useChat(profile, undefined));
    await act(() => result.current.send('Hello'));
    await act(() => result.current.retry());
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('ignores a second retry while the first is running', async () => {
    await repo.addMessage({ role: 'user', content: 'Stress', coach: 'arjun', createdAt: 1 });
    let release: (v: string) => void = () => undefined;
    generate.mockImplementation(() => new Promise((r) => (release = r)));
    const { result } = renderHook(() => useChat(profile, undefined));
    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.retry();
      void result.current.retry();
    });
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    await act(async () => {
      release('Okay.');
      await first;
    });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });
});
