import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { explainError, llm, LlmError, type ExplainedError } from '../llm';
import { buildSystemPrompt, parseReply, PROMPT_VERSION } from '../persona';
import { checkCrisis } from '../safety';
import { repo, type ChatRecord, type MoodEntry, type Profile } from '../storage';
import { buildMessages, safetyReply } from './conversation';

export interface ChatState {
  messages: ChatRecord[];
  /** Clean text of the reply being streamed, or null when idle. */
  pending: string | null;
  error: ExplainedError | null;
  send: (text: string) => Promise<void>;
  /** Asks again for a reply to the last message, without adding it a second time. */
  retry: () => Promise<void>;
  stop: () => void;
}

export function useChat(profile: Profile, mood: MoodEntry | undefined): ChatState {
  const messages = useLiveQuery(() => repo.recentMessages(100), [], []);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ExplainedError | null>(null);
  // Refs, not state: they must flip synchronously so a double Enter cannot start two replies.
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Leaving the chat (for example to Settings) stops the reply instead of orphaning it.
  useEffect(() => () => abortRef.current?.abort(), []);

  /** Streams a reply to the given history, which the caller has already safety-checked. */
  const reply = useCallback(
    async (history: ChatRecord[]) => {
      const coach = profile.coach;
      const controller = new AbortController();
      abortRef.current = controller;
      setPending('');
      const system = buildSystemPrompt({ coach, profile, mood });
      const raw = await llm.generate(buildMessages(system, history), {
        signal: controller.signal,
        maxTokens: 220,
        onToken: (_delta, full) => setPending(parseReply(full).text),
      });
      const parsed = parseReply(raw);
      if (parsed.text) {
        await repo.addMessage({
          role: 'assistant',
          content: parsed.text,
          coach,
          createdAt: Date.now(),
          gestures: parsed.gestures.map((g) => g.gesture),
          promptVersion: PROMPT_VERSION,
        });
      }
    },
    [profile, mood],
  );

  const handleError = useCallback((err: unknown) => {
    const stopped = abortRef.current?.signal.aborted || (err as Error)?.name === 'AbortError';
    if (stopped) return;
    setError(
      err instanceof LlmError ? { message: err.message, detail: err.detail } : explainError(err),
    );
  }, []);

  const send = useCallback(
    async (input: string) => {
      const text = input.trim();
      if (!text || busyRef.current) return;
      busyRef.current = true;
      setError(null);
      const coach = profile.coach;
      try {
        const crisis = checkCrisis(text).crisis;
        await repo.addMessage({
          role: 'user',
          content: text,
          coach,
          createdAt: Date.now(),
          safety: crisis,
        });

        if (crisis) {
          await repo.addMessage({
            role: 'assistant',
            content: safetyReply(coach, profile.name, profile.language),
            coach,
            createdAt: Date.now(),
            safety: true,
          });
          return;
        }

        await reply(await repo.recentMessages(50));
      } catch (err) {
        handleError(err);
      } finally {
        abortRef.current = null;
        busyRef.current = false;
        setPending(null);
      }
    },
    [profile, reply, handleError],
  );

  const retry = useCallback(async () => {
    if (busyRef.current) return;
    // Claim the busy flag before any await, so a double tap or a send cannot slip in.
    busyRef.current = true;
    setError(null);
    try {
      const history = await repo.recentMessages(50);
      const last = history.at(-1);
      // Only a user message still waiting for an answer can be retried. A crisis message is
      // never sent to the model, even an old one stored before the safety flag existed.
      if (!last || last.role !== 'user' || last.safety || checkCrisis(last.content).crisis) return;
      await reply(history);
    } catch (err) {
      handleError(err);
    } finally {
      abortRef.current = null;
      busyRef.current = false;
      setPending(null);
    }
  }, [reply, handleError]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { messages, pending, error, send, retry, stop };
}
