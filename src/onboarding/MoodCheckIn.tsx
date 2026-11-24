import { useId, useState } from 'react';
import type { MoodScore } from '../storage';
import { MOODS } from './labels';

interface Props {
  name: string;
  onSubmit: (score: MoodScore, note?: string) => Promise<void> | void;
  onSkip: () => void;
}

export function MoodCheckIn({ name, onSubmit, onSkip }: Props) {
  const uid = useId();
  const [score, setScore] = useState<MoodScore | undefined>();
  const [note, setNote] = useState('');

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        if (score) void onSubmit(score, note);
      }}
    >
      <fieldset>
        <legend>How are you feeling today, {name}?</legend>
        <div className="moods">
          {MOODS.map((m) => (
            <label key={m.score} className="mood">
              <input
                type="radio"
                name={`${uid}-mood`}
                value={m.score}
                checked={score === m.score}
                onChange={() => setScore(m.score)}
              />
              <span aria-hidden="true" className="mood-emoji">
                {m.emoji}
              </span>
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${uid}-note`}>Anything on your mind? (optional)</label>
      <textarea
        id={`${uid}-note`}
        rows={2}
        maxLength={280}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="actions">
        <button type="button" className="secondary" onClick={onSkip}>
          Skip for today
        </button>
        <button type="submit" disabled={!score}>
          Continue
        </button>
      </div>
    </form>
  );
}
