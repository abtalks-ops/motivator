import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { llm, useLlmState } from '../llm';
import { COACHES, greeting } from '../persona';
import { HelplineCard } from '../safety';
import type { MoodEntry, Profile } from '../storage';
import type { LlmChoice } from '../setup';
import { useChat } from './useChat';

interface Props {
  profile: Profile;
  mood: MoodEntry | undefined;
  choice: LlmChoice;
}

export function ChatScreen({ profile, mood, choice }: Props) {
  const uid = useId();
  const coach = COACHES[profile.coach];
  const llmState = useLlmState();
  const { messages, pending, error, send, stop } = useChat(profile, mood);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const ready = llmState.status === 'ready';
  const busy = pending !== null;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length, pending]);

  function submit() {
    if (!draft.trim() || busy || !ready) return;
    const text = draft;
    setDraft('');
    void send(text);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <section className="chat" aria-label={`Conversation with ${coach.name}`}>
      <ol className="messages" aria-live="polite">
        <li className="bubble coach">
          <span className="who">{coach.name}</span>
          {greeting(profile.coach, profile, mood)}
        </li>
        {messages.map((m) => (
          <Fragment key={m.id}>
            <li className={`bubble ${m.role === 'user' ? 'user' : 'coach'}`}>
              <span className="who">{m.role === 'user' ? 'You' : COACHES[m.coach].name}</span>
              {m.content}
            </li>
            {m.role === 'assistant' && m.safety && (
              <li className="inline-card">
                <HelplineCard />
              </li>
            )}
          </Fragment>
        ))}
        {busy && (
          <li className="bubble coach" aria-busy="true">
            <span className="who">{coach.name}</span>
            {pending || <span className="typing">thinking…</span>}
          </li>
        )}
      </ol>
      <div ref={endRef} />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {llmState.status === 'error' ? (
        <p className="error" role="alert">
          {llmState.error}{' '}
          <button type="button" onClick={() => void llm.load(choice.tier, choice.runtime)}>
            Retry
          </button>
        </p>
      ) : (
        !ready && <p className="muted small">{coach.name} is waking up…</p>
      )}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={`${uid}-input`} className="visually-hidden">
          Message {coach.name}
        </label>
        <textarea
          id={`${uid}-input`}
          rows={2}
          maxLength={1000}
          value={draft}
          placeholder={`Tell ${coach.name} what's on your mind`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {busy ? (
          <button type="button" className="secondary" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!ready || !draft.trim()}>
            Send
          </button>
        )}
      </form>
    </section>
  );
}
