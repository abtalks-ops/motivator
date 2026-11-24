import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { llm, MODELS, useLlmState } from '../llm';
import { MoodCheckIn, MOODS, OnboardingForm } from '../onboarding';
import { COACHES } from '../persona';
import { UpdatePrompt } from '../pwa/UpdatePrompt';
import { usePersistentStorage } from '../pwa/usePersistentStorage';
import { SettingsScreen } from '../settings';
import { ModelSetup, type LlmChoice } from '../setup';
import { localDay, repo, type Profile, type ProfileInput } from '../storage';

type View = 'home' | 'settings' | 'edit-profile' | 'change-model';

export const LLM_SETTING = 'llm';

const LOADING = Symbol('loading');

export function App() {
  const persisted = usePersistentStorage();
  const profile = useLiveQuery(() => repo.getProfile(), [], LOADING);
  const today = localDay();
  const mood = useLiveQuery(() => repo.moodForDay(today), [today], LOADING);
  const [moodSkippedOn, setMoodSkippedOn] = useState<string | null>(null);
  const [view, setView] = useState<View>('home');
  const llmChoice = useLiveQuery(() => repo.getSetting<LlmChoice>(LLM_SETTING), [], LOADING);

  // Once a model has been chosen, load it from the local cache in the background on every visit.
  useEffect(() => {
    if (llmChoice && llmChoice !== LOADING && llm.getState().status === 'idle') {
      void llm.load(llmChoice.tier, llmChoice.runtime);
    }
  }, [llmChoice]);

  const saveChoice = async (choice: LlmChoice) => {
    await repo.setSetting(LLM_SETTING, choice);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Motivator</h1>
        <p className="tagline">Your private, offline coach</p>
      </header>

      <main className="app-main" id="main">
        {profile === LOADING || mood === LOADING || llmChoice === LOADING ? (
          <p className="muted">Loading…</p>
        ) : !profile ? (
          <Welcome />
        ) : view === 'edit-profile' ? (
          <OnboardingForm
            initial={toInput(profile)}
            onCancel={() => setView('settings')}
            onSubmit={async (input) => {
              await repo.saveProfile(input);
              setView('settings');
            }}
          />
        ) : !llmChoice ? (
          <ModelSetup onReady={saveChoice} />
        ) : view === 'change-model' ? (
          <ModelSetup
            current={llmChoice}
            onCancel={() => setView('settings')}
            onReady={async (choice) => {
              await saveChoice(choice);
              setView('settings');
            }}
          />
        ) : view === 'settings' ? (
          <SettingsScreen
            profile={profile}
            modelLabel={MODELS[llmChoice.tier].label}
            onEditProfile={() => setView('edit-profile')}
            onChangeModel={() => setView('change-model')}
            onBack={() => setView('home')}
          />
        ) : !mood && moodSkippedOn !== today ? (
          <MoodCheckIn
            name={profile.name}
            onSubmit={async (score, note) => {
              await repo.logMood(score, note);
            }}
            onSkip={() => setMoodSkippedOn(today)}
          />
        ) : (
          <Home profile={profile} moodScore={mood?.score} onSettings={() => setView('settings')} />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Motivator is a coach, not a therapist, and does not give medical advice.
          {persisted === false && ' Your browser may clear stored data when space runs low.'}
        </p>
      </footer>

      <UpdatePrompt />
    </div>
  );
}

function Welcome() {
  return (
    <>
      <section className="card intro" aria-labelledby="welcome-title">
        <h2 id="welcome-title">Welcome</h2>
        <p>
          Talk through what is on your mind and get a small, concrete next step. It takes about a
          minute to set up, and everything stays on this device.
        </p>
      </section>
      <OnboardingForm
        onSubmit={async (input) => {
          await repo.saveProfile(input);
        }}
      />
    </>
  );
}

function Home({
  profile,
  moodScore,
  onSettings,
}: {
  profile: Profile;
  moodScore: number | undefined;
  onSettings: () => void;
}) {
  const mood = MOODS.find((m) => m.score === moodScore);
  const coach = COACHES[profile.coach];
  return (
    <section className="card" aria-labelledby="home-title">
      <h2 id="home-title">Hi {profile.name}</h2>
      {mood && (
        <p>
          Today you are feeling <strong>{mood.label.toLowerCase()}</strong>{' '}
          <span aria-hidden="true">{mood.emoji}</span>
        </p>
      )}
      <p>
        {coach.name} is getting ready to talk about <em>{profile.goal}</em>.
      </p>
      <CoachStatus />
      <p className="muted">Chat with your coach arrives in the next update.</p>
      <button type="button" className="secondary" onClick={onSettings}>
        Settings
      </button>
    </section>
  );
}

function CoachStatus() {
  const state = useLlmState();
  if (state.status === 'ready') return <p>Your coach is ready, even offline.</p>;
  if (state.status === 'error') return <p className="error">{state.error}</p>;
  return <p className="muted">Waking up your coach…</p>;
}

function toInput(profile: Profile): ProfileInput {
  const { id: _id, createdAt: _c, updatedAt: _u, ...input } = profile;
  return input;
}
