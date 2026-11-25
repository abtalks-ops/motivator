import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { llm, MODELS, smallerModelMayHelp, useLlmState } from '../llm';
import { COACHES, greeting } from '../persona';
import { HelplineCard } from '../safety';
import type { MoodEntry, Profile } from '../storage';
import type { LlmChoice } from '../setup';
import { useChat } from './useChat';

interface Props {
  profile: Profile;
  mood: MoodEntry | undefined;
  choice: LlmChoice;
  /** Moves to the CPU runtime and remembers it, for phones whose graphics chip fails. */
  onUseCpu: () => void;
  /** Moves to the small phone model and remembers it, for phones that run out of memory. */
  onUsePhoneModel: () => void;
}

export function ChatScreen({ profile, mood, choice, onUseCpu, onUsePhoneModel }: Props) {
  const uid = useId();
  const coach = COACHES[profile.coach];
  const llmState = useLlmState();
  const { messages, pending, error, send, retry, stop } = useChat(profile, mood);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const ready = llmState.status === 'ready';
  const busy = pending !== null;
  // Offer the phone model only for memory trouble, which a smaller model can actually avoid.
  const phoneFor = (detail: string | null) =>
    (llmState.tier ?? choice.tier) !== 'phone' && smallerModelMayHelp(detail)
      ? onUsePhoneModel
      : undefined;

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

      {error && llmState.status !== 'error' && (
        <ErrorNotice
          message={error.message}
          detail={error.detail}
          onRetry={ready ? () => void retry() : undefined}
          onCpu={llmState.runtime === 'webllm' ? onUseCpu : undefined}
          onPhone={phoneFor(error.detail)}
        />
      )}
      {llmState.status === 'error' ? (
        <ErrorNotice
          message={llmState.error ?? 'Something went wrong while loading the model.'}
          detail={llmState.errorDetail}
          onRetry={() =>
            void llm.load(llmState.tier ?? choice.tier, llmState.runtime ?? choice.runtime)
          }
          onCpu={llmState.runtime === 'webllm' ? onUseCpu : undefined}
          onPhone={phoneFor(llmState.errorDetail)}
        />
      ) : (
        !ready && (
          <p className="muted small" role="status">
            {coach.name} is waking up… {llmState.status === 'loading' && llmState.progress?.text}
          </p>
        )
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

interface ErrorNoticeProps {
  message: string;
  detail: string | null;
  onRetry?: (() => void) | undefined;
  onCpu?: (() => void) | undefined;
  onPhone?: (() => void) | undefined;
}

/** A failure with its plain reason, the runtime's own detail, and the ways out. */
function ErrorNotice({ message, detail, onRetry, onCpu, onPhone }: ErrorNoticeProps) {
  return (
    <div className="error-notice" role="alert">
      <p className="error">{message}</p>
      {detail && <p className="muted small error-detail">Technical detail: {detail}</p>}
      <div className="error-actions">
        {onRetry && (
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        )}
        {onCpu && (
          <button type="button" className="secondary" onClick={onCpu}>
            Use CPU mode (slower, needs one more download)
          </button>
        )}
        {onPhone && (
          <button type="button" className="secondary" onClick={onPhone}>
            Use the smaller phone model (about {MODELS.phone.downloadMB} MB download)
          </button>
        )}
      </div>
    </div>
  );
}
