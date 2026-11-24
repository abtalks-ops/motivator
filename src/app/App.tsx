import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { ChatScreen, logMoodSafely } from '../chat';
import { llm, logLlmError, MODELS } from '../llm';
import { MoodCheckIn, MOODS, OnboardingForm } from '../onboarding';
import { UpdatePrompt } from '../pwa/UpdatePrompt';
import { usePersistentStorage } from '../pwa/usePersistentStorage';
import { SettingsScreen } from '../settings';
import { ModelSetup, type LlmChoice } from '../setup';
import { localDay, repo, type MoodEntry, type Profile, type ProfileInput } from '../storage';

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
    if (!llmChoice || llmChoice === LOADING) return;
    const state = llm.getState();
    const differs = state.tier !== llmChoice.tier || state.runtime !== llmChoice.runtime;
    if (state.status === 'idle' || (differs && state.status !== 'loading')) {
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
            onCancel={() => {
              // A failed attempt may have unloaded the working model; bring the saved one back.
              void llm.load(llmChoice.tier, llmChoice.runtime);
              setView('settings');
            }}
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
              await logMoodSafely(profile, score, note);
            }}
            onSkip={() => setMoodSkippedOn(today)}
          />
        ) : (
          <Home
            profile={profile}
            mood={mood}
            choice={llmChoice}
            onSettings={() => setView('settings')}
            onUseCpu={async () => {
              try {
                await llm.switchToCpu();
                const state = llm.getState();
                if (state.status === 'ready' && state.tier) {
                  await saveChoice({ tier: state.tier, runtime: 'wllama' });
                }
              } catch (err) {
                logLlmError('switching to CPU mode failed', err);
              }
            }}
          />
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
  mood,
  choice,
  onSettings,
  onUseCpu,
}: {
  profile: Profile;
  mood: MoodEntry | undefined;
  choice: LlmChoice;
  onSettings: () => void;
  onUseCpu: () => Promise<void>;
}) {
  const moodInfo = MOODS.find((m) => m.score === mood?.score);
  return (
    <>
      <div className="home-bar">
        <p className="muted">
          {moodInfo ? (
            <>
              Feeling {moodInfo.label.toLowerCase()} today{' '}
              <span aria-hidden="true">{moodInfo.emoji}</span>
            </>
          ) : (
            `Hi ${profile.name}`
          )}
        </p>
        <button type="button" className="secondary" onClick={onSettings}>
          Settings
        </button>
      </div>
      <ChatScreen profile={profile} mood={mood} choice={choice} onUseCpu={() => void onUseCpu()} />
    </>
  );
}

function toInput(profile: Profile): ProfileInput {
  const { id: _id, createdAt: _c, updatedAt: _u, ...input } = profile;
  return input;
}
