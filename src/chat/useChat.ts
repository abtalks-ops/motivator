import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { llm } from '../llm';
import { buildSystemPrompt, parseReply, PROMPT_VERSION } from '../persona';
import { checkCrisis } from '../safety';
import { repo, type ChatRecord, type MoodEntry, type Profile } from '../storage';
import { buildMessages, safetyReply } from './conversation';

export interface ChatState {
  messages: ChatRecord[];
  /** Clean text of the reply being streamed, or null when idle. */
  pending: string | null;
  error: string | null;
  send: (text: string) => Promise<void>;
  stop: () => void;
}

export function useChat(profile: Profile, mood: MoodEntry | undefined): ChatState {
  const messages = useLiveQuery(() => repo.recentMessages(100), [], []);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Refs, not state: they must flip synchronously so a double Enter cannot start two replies.
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Leaving the chat (for example to Settings) stops the reply instead of orphaning it.
  useEffect(() => () => abortRef.current?.abort(), []);

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

        const controller = new AbortController();
        abortRef.current = controller;
        setPending('');
        const history = await repo.recentMessages(50);
        const system = buildSystemPrompt({ coach, profile, mood });
        const raw = await llm.generate(buildMessages(system, history), {
          signal: controller.signal,
          maxTokens: 220,
          onToken: (_delta, full) => setPending(parseReply(full).text),
        });
        const reply = parseReply(raw);
        if (reply.text) {
          await repo.addMessage({
            role: 'assistant',
            content: reply.text,
            coach,
            createdAt: Date.now(),
            gestures: reply.gestures.map((g) => g.gesture),
            promptVersion: PROMPT_VERSION,
          });
        }
      } catch (err) {
        const stopped = abortRef.current?.signal.aborted || (err as Error)?.name === 'AbortError';
        if (!stopped) setError(err instanceof Error ? err.message : 'Your coach could not reply.');
      } finally {
        abortRef.current = null;
        busyRef.current = false;
        setPending(null);
      }
    },
    [profile, mood],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { messages, pending, error, send, stop };
}
