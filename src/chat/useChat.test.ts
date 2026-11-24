import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import type * as LlmModule from '../llm';
import type { ChatMessage, GenerateOptions } from '../llm';
import { db, repo, type Profile } from '../storage';
import { useChat } from './useChat';

const generate = vi.fn<(messages: ChatMessage[], options?: GenerateOptions) => Promise<string>>();

vi.mock('../llm', async (importOriginal) => {
  const actual = await importOriginal<typeof LlmModule>();
  return {
    ...actual,
    llm: { generate: (m: ChatMessage[], o?: GenerateOptions) => generate(m, o) },
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
  await repo.clearMessages();
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
