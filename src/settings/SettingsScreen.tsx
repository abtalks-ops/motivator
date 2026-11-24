import { useState } from 'react';
import { llm } from '../llm';
import { FOCUS_LABELS, STYLE_LABELS } from '../onboarding';
import { COACHES } from '../persona';
import { deleteEverything, downloadExport, type Profile } from '../storage';

interface Props {
  profile: Profile;
  modelLabel: string;
  onEditProfile: () => void;
  onChangeModel: () => void;
  onBack: () => void;
  /** Called after all data is deleted. Defaults to reloading the page. */
  onDeleted?: () => void;
}

export function SettingsScreen({
  profile,
  modelLabel,
  onEditProfile,
  onChangeModel,
  onBack,
  onDeleted,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      // Stop the model first, so a background download cannot write files back afterwards.
      await llm.unload();
      await deleteEverything();
      (onDeleted ?? (() => window.location.reload()))();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <section className="card" aria-labelledby="profile-title">
        <h2 id="profile-title">Your profile</h2>
        <dl className="summary">
          <dt>Name</dt>
          <dd>{profile.name}</dd>
          <dt>Focus</dt>
          <dd>{FOCUS_LABELS[profile.focus]}</dd>
          <dt>Goal</dt>
          <dd>{profile.goal}</dd>
          <dt>Style</dt>
          <dd>{STYLE_LABELS[profile.style].label}</dd>
          <dt>Coach</dt>
          <dd>{COACHES[profile.coach].name}</dd>
        </dl>
        <button type="button" onClick={onEditProfile}>
          Edit profile
        </button>
      </section>

      <section className="card" aria-labelledby="model-title">
        <h2 id="model-title">Coach model</h2>
        <p>
          Using <strong>{modelLabel}</strong>, stored on this device.
        </p>
        <button type="button" className="secondary" onClick={onChangeModel}>
          Change model
        </button>
      </section>

      <section className="card" aria-labelledby="data-title">
        <h2 id="data-title">Your data</h2>
        <p>
          Everything is stored only in this browser. Export a copy, or delete it all, including
          downloaded models.
        </p>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => void downloadExport()}>
            Export my data
          </button>
          {!confirming ? (
            <button type="button" className="danger" onClick={() => setConfirming(true)}>
              Delete everything
            </button>
          ) : (
            <span role="alert" className="confirm">
              This cannot be undone.{' '}
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() => void handleDelete()}
              >
                Yes, delete it all
              </button>{' '}
              <button type="button" className="secondary" onClick={() => setConfirming(false)}>
                Keep my data
              </button>
            </span>
          )}
        </div>
      </section>

      <button type="button" className="secondary" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
