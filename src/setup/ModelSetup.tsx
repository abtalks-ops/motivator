import { useEffect, useId, useState } from 'react';
import {
  detectDevice,
  llm,
  MODELS,
  recommend,
  useLlmState,
  type ModelTier,
  type Recommendation,
  type RuntimeKind,
} from '../llm';

export interface LlmChoice {
  tier: ModelTier;
  runtime: RuntimeKind;
}

interface Props {
  /** The saved choice, when changing the model from settings. */
  current?: LlmChoice | undefined;
  onReady: (choice: LlmChoice) => Promise<void> | void;
  onCancel?: () => void;
}

export function ModelSetup({ current, onReady, onCancel }: Props) {
  const uid = useId();
  const state = useLlmState();
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [tier, setTier] = useState<ModelTier | undefined>(current?.tier);

  useEffect(() => {
    let cancelled = false;
    void detectDevice().then((device) => {
      if (cancelled) return;
      const r = recommend(device);
      setRec(r);
      setTier((t) => t ?? r.tier);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const runtime: RuntimeKind | undefined = rec?.runtime;
  const loading = state.status === 'loading';

  async function start() {
    if (!tier || !runtime) return;
    await llm.load(tier, runtime);
    if (llm.getState().status === 'ready') await onReady({ tier, runtime });
  }

  if (!rec || !tier) {
    return (
      <section className="card">
        <p className="muted">Checking what this device can run…</p>
      </section>
    );
  }

  const percent =
    state.progress?.fraction != null ? Math.round(state.progress.fraction * 100) : null;

  return (
    <section className="card" aria-labelledby={`${uid}-title`}>
      <h2 id={`${uid}-title`}>Download your coach&apos;s brain</h2>
      <p>
        Your coach runs entirely on this device. This is a one-time download, then it works offline.
        Use Wi-Fi if you can.
      </p>
      <p className="muted">{rec.reason}</p>

      <fieldset disabled={loading}>
        <legend>Model</legend>
        <div className="options">
          {(Object.keys(MODELS) as ModelTier[]).map((t) => (
            <label key={t} className="option">
              <input
                type="radio"
                name={`${uid}-tier`}
                value={t}
                checked={tier === t}
                onChange={() => setTier(t)}
              />
              <span>
                <strong>{MODELS[t].label}</strong>
                {rec.tier === t && <span className="badge">Recommended</span>}
                <span className="muted block">
                  {MODELS[t].description} About {formatSize(MODELS[t].downloadMB)}.
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {loading && (
        <div className="progress-block" aria-live="polite">
          <progress max={100} value={percent ?? undefined} aria-label="Model download progress" />
          <p className="muted small">{state.progress?.text ?? 'Starting…'}</p>
        </div>
      )}

      {state.status === 'error' && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}

      <div className="actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        )}
        <button type="button" onClick={() => void start()} disabled={loading}>
          {state.status === 'error' ? 'Retry' : loading ? 'Downloading…' : 'Download'}
        </button>
      </div>
    </section>
  );
}

function formatSize(mb: number): string {
  return mb >= 1000 ? `${(mb / 1000).toFixed(mb % 1000 ? 1 : 0)} GB` : `${mb} MB`;
}
