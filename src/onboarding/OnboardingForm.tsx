import { useId, useState, type FormEvent } from 'react';
import { COACHES, suggestCoach } from '../persona';
import {
  AGE_RANGES,
  COACH_IDS,
  COACH_STYLES,
  FOCUS_AREAS,
  LOW_TIMES,
  type AgeRange,
  type CoachId,
  type CoachStyle,
  type FocusArea,
  type LowTime,
  type ProfileInput,
} from '../storage';
import { AGE_LABELS, FOCUS_LABELS, LANGUAGES, LOW_TIME_LABELS, STYLE_LABELS } from './labels';

export const NAME_MAX = 40;
export const GOAL_MAX = 280;

interface Props {
  initial?: ProfileInput | undefined;
  onSubmit: (profile: ProfileInput) => Promise<void> | void;
  onCancel?: () => void;
}

const STEPS = ['About you', 'Your focus', 'Your coach', 'A bit more'] as const;

export function OnboardingForm({ initial, onSubmit, onCancel }: Props) {
  const uid = useId();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial?.name ?? '');
  const [focus, setFocus] = useState<FocusArea | undefined>(initial?.focus);
  const [goal, setGoal] = useState(initial?.goal ?? '');
  const [style, setStyle] = useState<CoachStyle | undefined>(initial?.style);
  const [coach, setCoach] = useState<CoachId | undefined>(initial?.coach);
  const [ageRange, setAgeRange] = useState<AgeRange | ''>(initial?.ageRange ?? '');
  const [language, setLanguage] = useState(initial?.language ?? '');
  const [lowTime, setLowTime] = useState<LowTime | ''>(initial?.lowTime ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isLast = step === STEPS.length - 1;

  function validate(): string | null {
    if (step === 0 && !name.trim()) return 'Please tell us what to call you.';
    if (step === 1 && !focus) return 'Pick the area you want to focus on.';
    if (step === 1 && !goal.trim()) return 'Describe one goal or challenge, in your own words.';
    if (step === 2 && !style) return 'Pick a coaching style.';
    if (step === 2 && !coach) return 'Pick your coach.';
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    if (!focus || !style || !coach) return;
    const profile: ProfileInput = { name, focus, goal, style, coach };
    if (ageRange) profile.ageRange = ageRange;
    if (language) profile.language = language;
    if (lowTime) profile.lowTime = lowTime;
    setSaving(true);
    try {
      await onSubmit(profile);
    } finally {
      setSaving(false);
    }
  }

  function chooseStyle(next: CoachStyle) {
    setStyle(next);
    setCoach(suggestCoach(next, coach));
  }

  const suggested = style ? suggestCoach(style, coach) : undefined;

  return (
    <form className="card onboarding" onSubmit={(e) => void handleSubmit(e)} noValidate>
      <p className="muted step-count" aria-live="polite">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      {step === 0 && (
        <fieldset>
          <legend>What should your coach call you?</legend>
          <label htmlFor={`${uid}-name`}>Name or nickname</label>
          <input
            id={`${uid}-name`}
            value={name}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
          <p className="muted">Everything you share stays on this device.</p>
        </fieldset>
      )}

      {step === 1 && (
        <>
          <fieldset>
            <legend>What is your main focus right now?</legend>
            <div className="chips">
              {FOCUS_AREAS.map((area) => (
                <label key={area} className="chip">
                  <input
                    type="radio"
                    name={`${uid}-focus`}
                    value={area}
                    checked={focus === area}
                    onChange={() => setFocus(area)}
                  />
                  <span>{FOCUS_LABELS[area]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor={`${uid}-goal`}>One goal or challenge, in your own words</label>
          <textarea
            id={`${uid}-goal`}
            value={goal}
            rows={3}
            maxLength={GOAL_MAX}
            placeholder="For example: I keep putting off my job applications."
            onChange={(e) => setGoal(e.target.value)}
          />
        </>
      )}

      {step === 2 && (
        <>
          <fieldset>
            <legend>How would you like to be coached?</legend>
            <div className="options">
              {COACH_STYLES.map((s) => (
                <label key={s} className="option">
                  <input
                    type="radio"
                    name={`${uid}-style`}
                    value={s}
                    checked={style === s}
                    onChange={() => chooseStyle(s)}
                  />
                  <span>
                    <strong>{STYLE_LABELS[s].label}</strong>
                    <span className="muted"> {STYLE_LABELS[s].hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Choose your coach</legend>
            <div className="options">
              {COACH_IDS.map((id) => (
                <label key={id} className="option">
                  <input
                    type="radio"
                    name={`${uid}-coach`}
                    value={id}
                    checked={coach === id}
                    onChange={() => setCoach(id)}
                  />
                  <span>
                    <strong>{COACHES[id].name}</strong>, {COACHES[id].tagline.toLowerCase()}
                    {suggested === id && style !== 'balanced' && (
                      <span className="badge">Suits your style</span>
                    )}
                    <span className="muted block">{COACHES[id].description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {step === 3 && (
        <fieldset>
          <legend>Optional, to help your coach</legend>
          <label htmlFor={`${uid}-age`}>Age range</label>
          <select
            id={`${uid}-age`}
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value as AgeRange | '')}
          >
            <option value="">Prefer not to say</option>
            {AGE_RANGES.map((a) => (
              <option key={a} value={a}>
                {AGE_LABELS[a]}
              </option>
            ))}
          </select>
          <label htmlFor={`${uid}-lang`}>Preferred language</label>
          <select id={`${uid}-lang`} value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">No preference</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <label htmlFor={`${uid}-low`}>When do you usually feel low?</label>
          <select
            id={`${uid}-low`}
            value={lowTime}
            onChange={(e) => setLowTime(e.target.value as LowTime | '')}
          >
            <option value="">Not sure</option>
            {LOW_TIMES.map((t) => (
              <option key={t} value={t}>
                {LOW_TIME_LABELS[t]}
              </option>
            ))}
          </select>
        </fieldset>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="actions">
        {step > 0 ? (
          <button type="button" className="secondary" onClick={() => setStep(step - 1)}>
            Back
          </button>
        ) : (
          onCancel && (
            <button type="button" className="secondary" onClick={onCancel}>
              Cancel
            </button>
          )
        )}
        <button type="submit" disabled={saving}>
          {isLast ? (initial ? 'Save' : 'Start') : 'Next'}
        </button>
      </div>
    </form>
  );
}
